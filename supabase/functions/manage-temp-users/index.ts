import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMP_DOMAIN = "temp.autospotters.local";
const HOURS_VALID = 72;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check – caller must be founder
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const callerId = claimsData.claims.sub as string;

    // Verify founder role
    const { data: callerProfile } = await anonClient
      .from("profiles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    if (callerProfile?.role !== "founder") {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Service role client for admin operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action, ...params } = await req.json();

    // ──── LIST ────
    if (action === "list") {
      const { data: temps } = await adminClient
        .from("profiles")
        .select("user_id, username, created_at, is_map_marker")
        .eq("is_temp", true)
        .order("username");
      return new Response(JSON.stringify({ ok: true, users: temps ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ──── CREATE ────
    if (action === "create") {
      const { username, password } = params as { username: string; password: string };
      if (!username?.trim() || !password?.trim()) {
        return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: corsHeaders });
      }

      const email = `${username.trim().toLowerCase().replace(/\s+/g, "")}@${TEMP_DOMAIN}`;
      const expiresAt = new Date(Date.now() + HOURS_VALID * 60 * 60 * 1000).toISOString();

      // Create auth user
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password: password.trim(),
        email_confirm: true,
      });
      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: corsHeaders });
      }
      const newUserId = authData.user.id;

      // Update profile
      await adminClient
        .from("profiles")
        .update({
          is_temp: true,
          temp_expires_at: expiresAt,
          username_locked: true,
          username: username.trim(),
        })
        .eq("user_id", newUserId);

      // Insert temp_access
      await adminClient.from("temp_access").insert({
        email,
        access_code: password.trim(),
        expires_at: expiresAt,
      });

      // Create friendship founder <-> new temp
      await adminClient.from("friendships").insert({
        requester_id: callerId,
        addressee_id: newUserId,
        status: "accepted",
      });

      // Create friendships with all existing temps
      const { data: existingTemps } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("is_temp", true)
        .neq("user_id", newUserId);

      if (existingTemps?.length) {
        const friendships = existingTemps.map((t) => ({
          requester_id: newUserId,
          addressee_id: t.user_id,
          status: "accepted",
        }));
        // Insert in batches to avoid payload limits
        for (let i = 0; i < friendships.length; i += 100) {
          await adminClient.from("friendships").insert(friendships.slice(i, i + 100));
        }
      }

      return new Response(
        JSON.stringify({ ok: true, user: { user_id: newUserId, username: username.trim(), email } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──── DELETE ────
    if (action === "delete") {
      const { user_id } = params as { user_id: string };
      if (!user_id) {
        return new Response(JSON.stringify({ error: "missing_user_id" }), { status: 400, headers: corsHeaders });
      }

      // Get email for temp_access cleanup
      const { data: profile } = await adminClient
        .from("profiles")
        .select("user_id, is_temp")
        .eq("user_id", user_id)
        .single();

      if (!profile || !profile.is_temp) {
        return new Response(JSON.stringify({ error: "not_temp_user" }), { status: 400, headers: corsHeaders });
      }

      // Delete friendships
      await adminClient
        .from("friendships")
        .delete()
        .or(`requester_id.eq.${user_id},addressee_id.eq.${user_id}`);

      // Delete temp_access by email pattern
      await adminClient
        .from("temp_access")
        .delete()
        .like("email", `%@${TEMP_DOMAIN}`)
        .eq("email", (await adminClient.auth.admin.getUserById(user_id)).data.user?.email ?? "");

      // Delete auth user (cascades profile)
      const { error: delErr } = await adminClient.auth.admin.deleteUser(user_id);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
