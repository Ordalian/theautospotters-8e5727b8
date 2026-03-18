-- Phase 2: Make dm-media and car-photos private; access via signed URLs only.
-- Frontend must use Edge Function get-signed-media-url to resolve URLs.

UPDATE storage.buckets SET public = false WHERE id IN ('dm-media', 'car-photos');

-- Remove public SELECT so only service role (Edge Function) can create signed URLs.
-- Keep INSERT/DELETE policies for authenticated users (upload/delete own).
DROP POLICY IF EXISTS "Anyone can view dm media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view car photos" ON storage.objects;

-- Private buckets: no SELECT for anon/authenticated; Edge Function uses service_role.
-- No new policy needed for SELECT — only service role will access via signed URLs.
