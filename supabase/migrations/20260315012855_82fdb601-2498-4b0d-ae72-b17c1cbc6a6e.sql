
-- Step 1: Add columns and config table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS flagged_for_deletion boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS flagged_by uuid DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read app_config" ON public.app_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Founder can manage app_config" ON public.app_config
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.app_config (key, value) VALUES ('signups_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
