/**
 * Invalidates all temp accounts: sets temp_expires_at to now() so they can no longer
 * sign in (expiration check in app will sign them out).
 *
 * Optionally also invalidates codes in temp_access so "Temporary access" login
 * returns invalid immediately.
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/invalidate-temp-users.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const now = new Date().toISOString();

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .update({ temp_expires_at: now })
    .eq("is_temp", true)
    .select("user_id");

  if (profileError) {
    console.error("Failed to update profiles:", profileError.message);
    throw profileError;
  }
  console.log("Updated temp_expires_at for all is_temp profiles.");

  const { error: accessError } = await supabase.from("temp_access").update({ expires_at: now });

  if (accessError) {
    console.error("Failed to update temp_access:", accessError.message);
    throw accessError;
  }
  console.log("Updated expires_at for all temp_access rows.");

  console.log("Done. Temp users will be signed out on next app check and cannot sign in with code anymore.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
