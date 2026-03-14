-- Role "map_marker": can add/delete POIs and upload POI images.
-- Add image_url to map_pois, RLS for insert/update/delete by map_marker/admin/founder, storage bucket.

-- 1. Add image_url to map_pois
ALTER TABLE public.map_pois ADD COLUMN IF NOT EXISTS image_url text;

-- 2. RLS: only map_marker, admin, founder can insert/update/delete POIs
CREATE POLICY "Map marker and staff can insert POIs"
  ON public.map_pois FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('map_marker', 'admin', 'founder')
  );

CREATE POLICY "Map marker and staff can update POIs"
  ON public.map_pois FOR UPDATE TO authenticated
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('map_marker', 'admin', 'founder')
  )
  WITH CHECK (true);

CREATE POLICY "Map marker and staff can delete POIs"
  ON public.map_pois FOR DELETE TO authenticated
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('map_marker', 'admin', 'founder')
  );

-- 3. Helper for storage policies (role check)
CREATE OR REPLACE FUNCTION public.user_can_manage_pois()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('map_marker', 'admin', 'founder')
  );
$$;

-- 4. Storage bucket for POI images
INSERT INTO storage.buckets (id, name, public) VALUES ('poi-images', 'poi-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies: anyone can read; only map_marker/admin/founder can upload/update/delete
CREATE POLICY "Public read POI images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'poi-images');

CREATE POLICY "Map marker and staff can upload POI images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'poi-images' AND public.user_can_manage_pois());

CREATE POLICY "Map marker and staff can update POI images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'poi-images' AND public.user_can_manage_pois())
  WITH CHECK (bucket_id = 'poi-images');

CREATE POLICY "Map marker and staff can delete POI images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'poi-images' AND public.user_can_manage_pois());
