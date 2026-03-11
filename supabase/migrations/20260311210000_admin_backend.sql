-- ============================================================
-- Admin backend: analytics tracking, support tickets, admin RPC
-- ============================================================

-- 1. Page views tracking
CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  duration_ms int
);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own page views"
  ON page_views FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own page views"
  ON page_views FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Staff can read all page views"
  ON page_views FOR SELECT USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );

CREATE INDEX idx_page_views_user ON page_views(user_id);
CREATE INDEX idx_page_views_page ON page_views(page);
CREATE INDEX idx_page_views_entered ON page_views(entered_at DESC);

-- 2. Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feature usage"
  ON feature_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can read all feature usage"
  ON feature_usage FOR SELECT USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );

CREATE INDEX idx_feature_usage_feature ON feature_usage(feature);
CREATE INDEX idx_feature_usage_used ON feature_usage(used_at DESC);

-- 3. Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own tickets"
  ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT USING (
    auth.uid() = user_id
    OR (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );

CREATE POLICY "Staff can update any ticket status"
  ON support_tickets FOR UPDATE USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);

-- 4. Support replies
CREATE TABLE IF NOT EXISTS support_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket participants can view replies"
  ON support_replies FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );

CREATE POLICY "Users can reply to own tickets"
  ON support_replies FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('founder', 'admin')
  );

CREATE INDEX idx_support_replies_ticket ON support_replies(ticket_id);

-- 5. RPC: get users for admin (joins auth.users email)
CREATE OR REPLACE FUNCTION get_users_for_admin()
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  role text,
  is_premium boolean,
  created_at timestamptz,
  car_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    u.email::text,
    p.username,
    p.role,
    p.is_premium,
    p.created_at,
    (SELECT count(*) FROM cars c WHERE c.user_id = p.user_id) AS car_count
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin')
  ORDER BY p.created_at DESC;
$$;

-- 6. RPC: admin stats overview
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_users bigint,
  total_spots bigint,
  total_miniatures bigint,
  total_messages bigint,
  total_dms bigint,
  total_deliveries bigint,
  total_tickets bigint,
  open_tickets bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM profiles) AS total_users,
    (SELECT count(*) FROM cars WHERE vehicle_type IS DISTINCT FROM 'hot_wheels') AS total_spots,
    (SELECT count(*) FROM cars WHERE vehicle_type = 'hot_wheels') AS total_miniatures,
    (SELECT count(*) FROM channel_replies) + (SELECT count(*) FROM channel_topics) AS total_messages,
    (SELECT count(*) FROM direct_messages) AS total_dms,
    (SELECT count(*) FROM deliveries) AS total_deliveries,
    (SELECT count(*) FROM support_tickets) AS total_tickets,
    (SELECT count(*) FROM support_tickets WHERE status = 'open') AS open_tickets
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin');
$$;

-- 7. RPC: top pages
CREATE OR REPLACE FUNCTION get_top_pages(p_limit int DEFAULT 10)
RETURNS TABLE (page text, visit_count bigint, avg_duration_ms bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pv.page,
    count(*) AS visit_count,
    coalesce(avg(pv.duration_ms)::bigint, 0) AS avg_duration_ms
  FROM page_views pv
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin')
  GROUP BY pv.page
  ORDER BY visit_count DESC
  LIMIT p_limit;
$$;

-- 8. RPC: top features
CREATE OR REPLACE FUNCTION get_top_features(p_limit int DEFAULT 10)
RETURNS TABLE (feature text, use_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fu.feature,
    count(*) AS use_count
  FROM feature_usage fu
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin')
  GROUP BY fu.feature
  ORDER BY use_count DESC
  LIMIT p_limit;
$$;
