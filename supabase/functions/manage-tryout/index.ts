import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRYOUT_DOMAIN = "tryout.autospotters.local";
const HOURS_VALID = 1;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ──── CREATE TRYOUT USER ────
    if (action === "create") {
      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const email = `tryout-${id}@${TRYOUT_DOMAIN}`;
      const password = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + HOURS_VALID * 60 * 60 * 1000).toISOString();

      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: corsHeaders });
      }
      const newUserId = authData.user.id;

      await adminClient.from("profiles").update({
        is_tryout: true,
        tryout_expires_at: expiresAt,
        username: `Visiteur-${id.slice(0, 6)}`,
        username_locked: true,
      }).eq("user_id", newUserId);

      // Auto-friend with founders and admins
      const { data: staffProfiles } = await adminClient
        .from("profiles")
        .select("user_id")
        .in("role", ["founder", "admin"]);

      if (staffProfiles && staffProfiles.length > 0) {
        const friendships = staffProfiles.map((s: any) => ({
          requester_id: s.user_id,
          addressee_id: newUserId,
          status: "accepted",
        }));
        await adminClient.from("friendships").insert(friendships);
      }

      return new Response(
        JSON.stringify({ ok: true, email, password, user_id: newUserId, expires_at: expiresAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ──── CLEANUP TRYOUT USER ────
    if (action === "cleanup") {
      const { user_id } = params as { user_id: string };
      if (!user_id) {
        return new Response(JSON.stringify({ error: "missing_user_id" }), { status: 400, headers: corsHeaders });
      }

      // Verify it's a tryout user
      const { data: profile } = await adminClient.from("profiles").select("is_tryout").eq("user_id", user_id).maybeSingle();
      if (!profile || !(profile as any).is_tryout) {
        return new Response(JSON.stringify({ error: "not_tryout" }), { status: 400, headers: corsHeaders });
      }

      // Delete all user data
      await adminClient.from("cars").delete().eq("user_id", user_id);
      await adminClient.from("car_likes").delete().eq("user_id", user_id);
      await adminClient.from("friendships").delete().or(`requester_id.eq.${user_id},addressee_id.eq.${user_id}`);
      await adminClient.from("direct_messages").delete().or(`sender_id.eq.${user_id},receiver_id.eq.${user_id}`);
      await adminClient.from("dm_conversation_status").delete().or(`user_id.eq.${user_id},other_user_id.eq.${user_id}`);
      await adminClient.from("notifications").delete().eq("user_id", user_id);
      await adminClient.from("page_views").delete().eq("user_id", user_id);
      await adminClient.from("feature_usage").delete().eq("user_id", user_id);
      await adminClient.from("user_game_cards").delete().eq("user_id", user_id);
      await adminClient.from("user_booster_cooldown").delete().eq("user_id", user_id);
      await adminClient.from("user_deck").delete().eq("user_id", user_id);
      await adminClient.from("user_owned_styles").delete().eq("user_id", user_id);
      await adminClient.from("user_xp_gains").delete().eq("user_id", user_id);
      await adminClient.from("spotter_usage").delete().eq("user_id", user_id);
      await adminClient.from("garage_groups").delete().eq("user_id", user_id);
      await adminClient.from("user_blacklist").delete().eq("user_id", user_id);
      await adminClient.from("channel_subscriptions").delete().eq("user_id", user_id);

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
