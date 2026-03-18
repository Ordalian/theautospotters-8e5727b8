import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "600",
};

const TRY_DOMAIN = "try.autospotters.local";

async function listAllObjectPaths(adminClient: any, bucket: string, prefix: string) {
  // Objects in this app are stored as: <userId>/<filename>, so we only need one-level listing.
  const paths: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await adminClient.storage.from(bucket).list(prefix, { limit, offset });
    if (error) throw error;
    const items = data ?? [];
    for (const item of items) {
      paths.push(`${prefix}/${item.name}`);
    }
    if (items.length < limit) break;
    offset += limit;
    if (paths.length > 2000) break; // safety bound
  }

  return paths;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Bind caller token to read auth claims + validate "temp try" identity.
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub as string;
    const email = claimsData.claims.email as string | undefined;

    // Extra safety: only allow cleanup for "temp try" domain users.
    const emailOk = !!email && email.endsWith(`@${TRY_DOMAIN}`);
    if (!emailOk) {
      // Fallback: validate by username prefix (created by temp-try-create).
      const { data: profileRow } = await anonClient
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();
      const username = (profileRow as { username?: string } | null)?.username ?? "";
      if (!username.startsWith("try_")) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
      }
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Storage cleanup (best effort).
    const buckets = ["car-photos", "dm-media", "poi-images"];
    for (const bucket of buckets) {
      try {
        const paths = await listAllObjectPaths(adminClient, bucket, userId);
        if (paths.length) {
          for (let i = 0; i < paths.length; i += 100) {
            await adminClient.storage.from(bucket).remove(paths.slice(i, i + 100));
          }
        }
      } catch {
        // ignore storage cleanup errors
      }
    }

    // Tables cleanup (best effort).
    await adminClient
      .from("direct_messages")
      .delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .catch(() => {});

    await adminClient
      .from("friendships")
      .delete()
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .catch(() => {});

    await adminClient
      .from("dm_conversation_status")
      .delete()
      .or(`user_id.eq.${userId},other_user_id.eq.${userId}`)
      .catch(() => {});

    // Delete auth user (cascades most DB data).
    await adminClient.auth.admin.deleteUser(userId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});

