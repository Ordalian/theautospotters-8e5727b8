import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_BUCKETS = ["dm-media", "car-photos"] as const;
const EXPIRES_IN = 3600; // 1 hour

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Extract bucket and path from a Supabase storage public URL. */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const match =
      u.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/) ??
      u.pathname.match(/\/storage\/v1\/render\/image\/public\/([^/]+)\/(.+)/);
    if (!match) return null;
    const [, bucket, path] = match;
    return { bucket, path: decodeURIComponent(path) };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    const uid = userData.user.id;

    let bucket: string;
    let path: string;

    const body = await req.json().catch(() => ({}));
    if (body.url && typeof body.url === "string") {
      const parsed = parseStorageUrl(body.url);
      if (!parsed || !ALLOWED_BUCKETS.includes(parsed.bucket as any)) {
        return jsonResponse({ error: "invalid_url" }, 400);
      }
      bucket = parsed.bucket;
      path = parsed.path;
    } else if (body.bucket && body.path && typeof body.bucket === "string" && typeof body.path === "string") {
      if (!ALLOWED_BUCKETS.includes(body.bucket)) {
        return jsonResponse({ error: "invalid_bucket" }, 400);
      }
      bucket = body.bucket;
      path = body.path.replace(/^\/+/, "");
    } else {
      return jsonResponse({ error: "missing_url_or_bucket_path" }, 400);
    }

    const pathSegments = path.split("/");
    const pathOwner = pathSegments[0];

    if (bucket === "dm-media") {
      if (pathOwner !== uid) {
        const { data: messages } = await anonClient
          .from("direct_messages")
          .select("id, image_url, video_url")
          .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
        const hasAccess = (messages ?? []).some(
          (m) => (m.image_url && m.image_url.includes(path)) || (m.video_url && m.video_url.includes(path))
        );
        if (!hasAccess) {
          return jsonResponse({ error: "forbidden" }, 403);
        }
      }
    } else if (bucket === "car-photos") {
      if (pathOwner !== uid) {
        const { data: a } = await anonClient
          .from("friendships")
          .select("requester_id")
          .eq("status", "accepted")
          .eq("requester_id", uid)
          .eq("addressee_id", pathOwner)
          .limit(1)
          .maybeSingle();
        const { data: b } = await anonClient
          .from("friendships")
          .select("requester_id")
          .eq("status", "accepted")
          .eq("requester_id", pathOwner)
          .eq("addressee_id", uid)
          .limit(1)
          .maybeSingle();
        if (!a && !b) {
          return jsonResponse({ error: "forbidden" }, 403);
        }
      }
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: signed, error: signErr } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(path, EXPIRES_IN);

    if (signErr || !signed?.signedUrl) {
      return jsonResponse({ error: "sign_failed", details: signErr?.message }, 500);
    }

    return jsonResponse({ url: signed.signedUrl });
  } catch (e) {
    return jsonResponse({ error: "internal", details: String(e) }, 500);
  }
});
