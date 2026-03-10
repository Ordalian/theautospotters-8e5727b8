-- Bucket pour les images Midjourney des cartes (card-images)
INSERT INTO storage.buckets (id, name, public) VALUES ('card-images', 'card-images', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique (URLs utilisées par getCardImageUrl)
CREATE POLICY "Anyone can view card images"
ON storage.objects FOR SELECT
USING (bucket_id = 'card-images');

-- Upload : utilisateurs authentifiés (script avec SUPABASE_SERVICE_ROLE_KEY contourne RLS)
CREATE POLICY "Authenticated can upload card images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'card-images' AND auth.uid() IS NOT NULL);
