-- Coaches table: stores coach names that don't have a Supabase auth account yet.
-- When a coach eventually creates an account, their profile name is merged in
-- the /api/coaches endpoint; no data migration is needed.

CREATE TABLE IF NOT EXISTS coaches (
  id   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read coaches" ON coaches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or director can manage coaches" ON coaches
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'director')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'director')
    )
  );
