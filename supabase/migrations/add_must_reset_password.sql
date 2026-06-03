ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_reset_password boolean DEFAULT false;
