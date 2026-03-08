
CREATE OR REPLACE FUNCTION public.notify_topic_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  topic_title TEXT;
  reply_username TEXT;
BEGIN
  -- Get topic title
  SELECT t.title INTO topic_title
  FROM public.channel_topics t
  WHERE t.id = NEW.topic_id;

  -- Get replier username
  SELECT COALESCE(p.username, 'Anonyme') INTO reply_username
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  -- Notify topic creator + all other repliers (excluding the replier themselves)
  FOR r IN
    SELECT DISTINCT sub.user_id
    FROM (
      -- Topic creator
      SELECT ct.user_id FROM public.channel_topics ct WHERE ct.id = NEW.topic_id
      UNION
      -- All previous repliers
      SELECT cr.user_id FROM public.channel_replies cr WHERE cr.topic_id = NEW.topic_id
    ) sub
    WHERE sub.user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, data)
    VALUES (r.user_id, 'topic_reply', jsonb_build_object(
      'topic_id', NEW.topic_id,
      'topic_title', topic_title,
      'reply_id', NEW.id,
      'replier_username', reply_username
    ));
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_channel_reply_notify
  AFTER INSERT ON public.channel_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_topic_participants();
