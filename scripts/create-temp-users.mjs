/**
 * Creates 50 temporary accounts (tempuser1..tempuser50), random passwords,
 * 72h expiry, half map markers, founder + all temps as friends, temps friends with each other.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/create-temp-users.mjs
 *
 * Optional: FOUNDER_USER_ID=uuid to use a specific founder; otherwise fetches role=founder.
 *
 * Output: temp-users-list.csv and printed table (username, password). Keep the CSV secure.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FOUNDER_USER_ID = process.env.FOUNDER_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function randomPassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let s = "";
  for (let i = 0; i < length; i++) s += chars[bytes[i] % chars.length];
  return s;
}

const TEMP_EMAIL_DOMAIN = "temp.autospotters.local";
const HOURS_VALID = 72;

async function main() {
  const expiresAt = new Date(Date.now() + HOURS_VALID * 60 * 60 * 1000).toISOString();
  const tempUsers = [];
  const passwords = Array.from({ length: 50 }, () => randomPassword());

  console.log("Creating 50 temp auth users and profiles...");
  for (let i = 1; i <= 50; i++) {
    const email = `tempuser${i}@${TEMP_EMAIL_DOMAIN}`;
    const password = passwords[i - 1];
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      console.error(`Failed to create ${email}:`, error.message);
      throw error;
    }
    tempUsers.push({ id: user.user.id, email, username: `tempuser${i}`, password });
    if (i % 10 === 0) console.log(`  ${i}/50 created`);
  }

  console.log("Updating profiles (is_temp, temp_expires_at, is_map_marker, username_locked)...");
  for (let i = 0; i < tempUsers.length; i++) {
    const u = tempUsers[i];
    const isMapMarker = i < 25;
    const { error } = await supabase
      .from("profiles")
      .update({
        is_temp: true,
        temp_expires_at: expiresAt,
        is_map_marker: isMapMarker,
        username_locked: true,
      })
      .eq("user_id", u.id);
    if (error) {
      console.error(`Failed to update profile ${u.username}:`, error.message);
      throw error;
    }
  }

  console.log("Inserting temp_access rows...");
  const { error: insertAccessError } = await supabase.from("temp_access").insert(
    tempUsers.map((u) => ({
      email: u.email,
      access_code: u.password,
      expires_at: expiresAt,
    }))
  );
  if (insertAccessError) {
    console.error("Failed to insert temp_access:", insertAccessError.message);
    throw insertAccessError;
  }

  let founderId = FOUNDER_USER_ID;
  if (!founderId) {
    const { data: founder } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("role", "founder")
      .limit(1)
      .single();
    founderId = founder?.user_id;
  }
  if (!founderId) {
    console.warn("No founder user found (role=founder). Skipping founder friendships.");
  } else {
    console.log("Creating founder <-> temp friendships...");
    for (const u of tempUsers) {
      const { error } = await supabase.from("friendships").insert({
        requester_id: founderId,
        addressee_id: u.id,
        status: "accepted",
      });
      if (error) {
        if (error.code === "23505") console.log(`  Friendship founder-${u.username} already exists`);
        else throw error;
      }
    }
  }

  console.log("Creating temp <-> temp friendships...");
  let inserted = 0;
  for (let i = 0; i < tempUsers.length; i++) {
    for (let j = i + 1; j < tempUsers.length; j++) {
      const { error } = await supabase.from("friendships").insert({
        requester_id: tempUsers[i].id,
        addressee_id: tempUsers[j].id,
        status: "accepted",
      });
      if (error) {
        if (error.code !== "23505") throw error;
      } else inserted++;
    }
  }
  console.log(`  ${inserted} temp-temp friendships inserted.`);

  const csv = ["username,password", ...tempUsers.map((u) => `${u.username},${u.password}`)].join("\n");
  const fs = await import("fs");
  fs.writeFileSync("temp-users-list.csv", csv, "utf8");
  console.log("\nWrote temp-users-list.csv");

  console.log("\n--- Temp users (username / password) ---");
  console.log("username\t\tpassword");
  tempUsers.forEach((u) => console.log(`${u.username}\t\t${u.password}`));
  console.log("\nExpires at:", expiresAt);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
