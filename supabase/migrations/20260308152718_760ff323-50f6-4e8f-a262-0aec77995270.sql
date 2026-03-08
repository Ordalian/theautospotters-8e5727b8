
-- Channels table (predefined channels)
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view channels"
  ON public.channels FOR SELECT
  TO authenticated
  USING (true);

-- Channel topics (threads created by users)
CREATE TABLE public.channel_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channel_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view topics"
  ON public.channel_topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create topics"
  ON public.channel_topics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics"
  ON public.channel_topics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Channel replies
CREATE TABLE public.channel_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.channel_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channel_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view replies"
  ON public.channel_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create replies"
  ON public.channel_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON public.channel_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Seed the 3 default channels
INSERT INTO public.channels (name, slug, description, sort_order) VALUES
  ('Général', 'general', 'Discussions générales', 0),
  ('La Mécanique', 'mecanique', 'Parlons mécanique automobile', 1),
  ('Confirmation de Spots', 'confirmation-spots', 'Confirmez vos spots entre passionnés', 2);

-- Enable realtime for topics and replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_replies;
