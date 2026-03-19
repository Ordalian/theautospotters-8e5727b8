
CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://qbbhsrlyttjgdkuovjwk.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiYmhzcmx5dHRqZ2RrdW92andrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzI4OTUsImV4cCI6MjA4NjI0ODg5NX0.tOzLf3ojMFzSRo9ynn72ybdth58Ru7-W3xl7MYFpoOk'
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'user_id', NEW.user_id,
        'type', NEW.type,
        'data', NEW.data
      )
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push notification dispatch failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
