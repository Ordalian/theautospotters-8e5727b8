
-- Fix Security Definer View: set security_invoker on profiles_public
ALTER VIEW public.profiles_public SET (security_invoker = on);
