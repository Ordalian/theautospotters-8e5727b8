-- Fix: car-photos bucket has no SELECT policy, so images can't be loaded
-- Make car photos publicly readable (they're just car pictures, not sensitive)
CREATE POLICY "Public read car photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-photos');

-- Fix: dm-media bucket has no SELECT policy, so DM images/videos can't be loaded
-- Allow authenticated users to read dm-media (URLs are in RLS-protected DMs)
CREATE POLICY "Authenticated can read dm media"
ON storage.objects FOR SELECT
USING (bucket_id = 'dm-media' AND auth.uid() IS NOT NULL);
