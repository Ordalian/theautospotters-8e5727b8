-- Harden profiles_public visibility: authenticated only
-- Rationale: avoid exposing usernames/roles/premium to anon scraping.

REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;

-- Ensure view uses invoker security (RLS applies as caller)
ALTER VIEW public.profiles_public SET (security_invoker = on);

