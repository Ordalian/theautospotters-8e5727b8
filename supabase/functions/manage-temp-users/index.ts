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
    // Auth check – caller must be staff (founder or admin)
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

    // Get caller profile
    const { data: callerProfile } = await anonClient
      .from("profiles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    const callerRole = callerProfile?.role;
    const isFounder = callerRole === "founder";
    const isStaff = callerRole === "founder" || callerRole === "admin";

    if (!isStaff) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Service role client for admin operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action, ...params } = await req.json();

    // ──── LIST TEMP USERS ────
    if (action === "list") {
      const { data: temps } = await adminClient
        .from("profiles")
        .select("user_id, username, created_at, is_map_marker")
        .eq("is_temp", true)
        .order("username");
      return new Response(JSON.stringify({ ok: true, users: temps ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ──── CREATE TEMP USER ──── (founder only)
    if (action === "create") {
      if (!isFounder) {
        return new Response(JSON.stringify({ error: "founder_only" }), { status: 403, headers: corsHeaders });
      }
      const { username, password } = params as { username: string; password: string };
      if (!username?.trim() || !password?.trim()) {
        return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: corsHeaders });
      }

      const email = `${username.trim().toLowerCase().replace(/\s+/g, "")}@${TEMP_DOMAIN}`;
      const expiresAt = new Date(Date.now() + HOURS_VALID * 60 * 60 * 1000).toISOString();

      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password: password.trim(),
        email_confirm: true,
      });
      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: corsHeaders });
      }
      const newUserId = authData.user.id;

      await adminClient.from("profiles").update({
        is_temp: true, temp_expires_at: expiresAt, username_locked: true, username: username.trim(),
      }).eq("user_id", newUserId);

      await adminClient.from("temp_access").insert({ email, access_code: password.trim(), expires_at: expiresAt });

      // Friendships: founder <-> new temp
      await adminClient.from("friendships").insert({ requester_id: callerId, addressee_id: newUserId, status: "accepted" });

      // Friendships: all existing temps <-> new temp
      const { data: existingTemps } = await adminClient.from("profiles").select("user_id").eq("is_temp", true).neq("user_id", newUserId);
      if (existingTemps?.length) {
        const friendships = existingTemps.map((t) => ({ requester_id: newUserId, addressee_id: t.user_id, status: "accepted" }));
        for (let i = 0; i < friendships.length; i += 100) {
          await adminClient.from("friendships").insert(friendships.slice(i, i + 100));
        }
      }

      return new Response(
        JSON.stringify({ ok: true, user: { user_id: newUserId, username: username.trim(), email } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──── DELETE TEMP USER ──── (founder only)
    if (action === "delete") {
      if (!isFounder) {
        return new Response(JSON.stringify({ error: "founder_only" }), { status: 403, headers: corsHeaders });
      }
      const { user_id } = params as { user_id: string };
      if (!user_id) {
        return new Response(JSON.stringify({ error: "missing_user_id" }), { status: 400, headers: corsHeaders });
      }

      const { data: profile } = await adminClient.from("profiles").select("user_id, is_temp").eq("user_id", user_id).single();
      if (!profile || !profile.is_temp) {
        return new Response(JSON.stringify({ error: "not_temp_user" }), { status: 400, headers: corsHeaders });
      }

      await adminClient.from("friendships").delete().or(`requester_id.eq.${user_id},addressee_id.eq.${user_id}`);
      await adminClient.from("temp_access").delete().like("email", `%@${TEMP_DOMAIN}`).eq("email", (await adminClient.auth.admin.getUserById(user_id)).data.user?.email ?? "");
      const { error: delErr } = await adminClient.auth.admin.deleteUser(user_id);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ──── DELETE ANY USER ──── (founder only, with confirmation token)
    if (action === "delete_user") {
      if (!isFounder) {
        return new Response(JSON.stringify({ error: "founder_only" }), { status: 403, headers: corsHeaders });
      }
      const { user_id } = params as { user_id: string };
      if (!user_id) {
        return new Response(JSON.stringify({ error: "missing_user_id" }), { status: 400, headers: corsHeaders });
      }
      // Cannot delete founder
      const { data: targetProfile } = await adminClient.from("profiles").select("role").eq("user_id", user_id).single();
      if (targetProfile?.role === "founder") {
        return new Response(JSON.stringify({ error: "cannot_delete_founder" }), { status: 400, headers: corsHeaders });
      }

      // Clean up related data
      await adminClient.from("friendships").delete().or(`requester_id.eq.${user_id},addressee_id.eq.${user_id}`);
      await adminClient.from("direct_messages").delete().or(`sender_id.eq.${user_id},receiver_id.eq.${user_id}`);
      await adminClient.from("dm_conversation_status").delete().or(`user_id.eq.${user_id},other_user_id.eq.${user_id}`);
      await adminClient.from("temp_access").delete().eq("email", (await adminClient.auth.admin.getUserById(user_id)).data.user?.email ?? "");

      // Delete auth user (cascades profile via trigger)
      const { error: delErr } = await adminClient.auth.admin.deleteUser(user_id);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ──── FLAG USER ──── (admin or founder)
    if (action === "flag_user") {
      const { user_id } = params as { user_id: string };
      if (!user_id) {
        return new Response(JSON.stringify({ error: "missing_user_id" }), { status: 400, headers: corsHeaders });
      }
      // Cannot flag founder
      const { data: targetProfile } = await adminClient.from("profiles").select("role").eq("user_id", user_id).single();
      if (targetProfile?.role === "founder") {
        return new Response(JSON.stringify({ error: "cannot_flag_founder" }), { status: 400, headers: corsHeaders });
      }
      await adminClient.from("profiles").update({ flagged_for_deletion: true, flagged_by: callerId }).eq("user_id", user_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ──── UNFLAG USER ──── (admin or founder)
    if (action === "unflag_user") {
      const { user_id } = params as { user_id: string };
      if (!user_id) {
        return new Response(JSON.stringify({ error: "missing_user_id" }), { status: 400, headers: corsHeaders });
      }
      await adminClient.from("profiles").update({ flagged_for_deletion: false, flagged_by: null }).eq("user_id", user_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ──── TOGGLE SIGNUPS ──── (founder only)
    if (action === "toggle_signups") {
      if (!isFounder) {
        return new Response(JSON.stringify({ error: "founder_only" }), { status: 403, headers: corsHeaders });
      }
      const { enabled } = params as { enabled: boolean };
      await adminClient.from("app_config").upsert({ key: "signups_enabled", value: enabled, updated_at: new Date().toISOString() });
      return new Response(JSON.stringify({ ok: true, enabled }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ──── GET SIGNUPS STATUS ────
    if (action === "get_signups_status") {
      const { data } = await adminClient.from("app_config").select("value").eq("key", "signups_enabled").single();
      const enabled = data?.value === true || data?.value === "true";
      return new Response(JSON.stringify({ ok: true, enabled }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
