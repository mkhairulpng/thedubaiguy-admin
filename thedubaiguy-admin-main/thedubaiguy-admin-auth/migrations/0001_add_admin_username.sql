ALTER TABLE admin_users ADD COLUMN username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_idx ON admin_users (username);
