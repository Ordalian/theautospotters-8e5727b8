-- Restrict car-photos uploads to own folder so users cannot upload into another user's path.
DROP POLICY IF EXISTS "Authenticated users can upload car photos" ON storage.objects;
CREATE POLICY "Users can upload car photos to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'car-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
