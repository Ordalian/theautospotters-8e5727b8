-- Add role column to profiles: 'user' (default), 'admin', 'founder'
-- Add is_premium boolean for future use
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- Set founder role for arno.delgrange@gmail.com
UPDATE profiles
SET role = 'founder'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'arno.delgrange@gmail.com' LIMIT 1);

-- Expose role and is_premium through the public view
DROP VIEW IF EXISTS profiles_public;
CREATE VIEW profiles_public AS
  SELECT
    user_id,
    username,
    avatar_url,
    created_at,
    pinned_car_id,
    total_xp,
    emblem_slot_1,
    emblem_slot_2,
    emblem_slot_3,
    role,
    is_premium
  FROM profiles;

-- RLS: only founder can change roles
CREATE POLICY "Founder can update any profile role"
  ON profiles FOR UPDATE
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) = 'founder'
  )
  WITH CHECK (true);

-- Allow founder and admin to delete any car
CREATE POLICY "Admin/founder can delete any car"
  ON cars FOR DELETE
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );

-- Allow founder and admin to delete any channel topic
CREATE POLICY "Admin/founder can delete any topic"
  ON channel_topics FOR DELETE
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );

-- Allow founder and admin to delete any channel reply
CREATE POLICY "Admin/founder can delete any reply"
  ON channel_replies FOR DELETE
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );

-- Allow founder and admin to delete any direct message
CREATE POLICY "Admin/founder can delete any DM"
  ON direct_messages FOR DELETE
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );
