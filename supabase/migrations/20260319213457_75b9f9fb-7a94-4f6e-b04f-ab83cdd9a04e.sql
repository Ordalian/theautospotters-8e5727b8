INSERT INTO public.app_config (key, value)
VALUES ('vapid_public_key', '"BByMZ6ymYscXctS2EHikSFe4k6gc_8p2xUab3dxEjbUKzk7k6sS9SZC88UIO7opMwlQLIGY_LZzb3yb3j-Y3YjA"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();