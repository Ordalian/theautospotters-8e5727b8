-- Temporary access: 50 temp users, code-only login, 72h expiry.
-- Profiles: mark temp users and expiry.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_temp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_expires_at timestamptz DEFAULT NULL;

-- Table to map access code -> email for temp login (code is the password).
-- No SELECT for authenticated; only get_temp_login RPC reads it.
CREATE TABLE IF NOT EXISTS public.temp_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  access_code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.temp_access ENABLE ROW LEVEL SECURITY;

-- No direct read: only the definer RPC can use the table
CREATE POLICY "No direct select on temp_access"
  ON public.temp_access FOR SELECT TO authenticated
  USING (false);

-- RPC: return email for valid code (so client can signInWithPassword(email, code)).
CREATE OR REPLACE FUNCTION public.get_temp_login(p_code text)
RETURNS table(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.email
  FROM public.temp_access t
  WHERE t.access_code = p_code
    AND t.expires_at > now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_temp_login(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_temp_login(text) TO authenticated;

COMMENT ON TABLE public.temp_access IS 'Temporary access codes for tempuser1..50; code = password, 72h validity.';
