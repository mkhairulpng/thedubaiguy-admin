CREATE TABLE IF NOT EXISTS qr_login_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  scan_token_hash TEXT NOT NULL,
  poll_token_hash TEXT NOT NULL,
  user_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  next_path TEXT NOT NULL DEFAULT '/admin',
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  approved_at TEXT,
  claimed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS qr_login_sessions_expires_at_idx
  ON qr_login_sessions (expires_at);
