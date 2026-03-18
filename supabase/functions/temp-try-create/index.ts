import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Email domain used to identify temporary try users.
const TRY_DOMAIN = "try.autospotters.local";
const HOURS_VALID = 24 * 7; // kept long enough; we also delete on site exit

function randomString(length = 18) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// Create a "temporary try" user (guest -> full access), then return credentials for client-side signIn.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const short = randomString(10);
    const email = `${short}@${TRY_DOMAIN}`;
    const password = randomString(18);

    // Create auth user (profile row is auto-created by trigger on signup)
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: `try_${short}` },
    });

    if (authErr) {
      return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: corsHeaders });
    }

    const userId = authData.user.id;
    const expiresAt = new Date(Date.now() + HOURS_VALID * 60 * 60 * 1000).toISOString();

    // Mark profile as temp try and grant map marker permissions.
    const { error: profileErr } = await adminClient
      .from("profiles")
      .update({
        is_temp: true,
        temp_expires_at: expiresAt,
        username_locked: true,
        is_map_marker: true,
        username: `try_${short}`,
      })
      .eq("user_id", userId);

    if (profileErr) {
      // Best-effort cleanup if profile marking fails.
      await adminClient.auth.admin.deleteUser(userId).catch(() => {});
      return new Response(JSON.stringify({ error: profileErr.message }), { status: 400, headers: corsHeaders });
    }

    // Make this temp try user friends with a founder so "Friends" and "Messaging" work immediately.
    const { data: founderRow, error: founderErr } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("role", "founder")
      .limit(1)
      .maybeSingle();

    if (founderErr) {
      return new Response(JSON.stringify({ error: founderErr.message }), { status: 500, headers: corsHeaders });
    }
    if (!founderRow?.user_id) {
      return new Response(JSON.stringify({ error: "no_founder_user" }), { status: 500, headers: corsHeaders });
    }

    await adminClient.from("friendships").insert({
      requester_id: founderRow.user_id,
      addressee_id: userId,
      status: "accepted",
    }).catch(() => {});

    return new Response(
      JSON.stringify({ ok: true, email, password }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});

