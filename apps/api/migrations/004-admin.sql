-- Admin tokens (the CLI's own credential) and the audit of every admin call. Ids and timestamps follow 001: TEXT and ISO-8601 TEXT.
CREATE TABLE admin_token (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL CHECK (scopes IN ('read','read write')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE TABLE admin_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at TEXT NOT NULL,
  token_id TEXT,
  method TEXT NOT NULL,
  route TEXT NOT NULL,
  target_id TEXT,
  dry_run INTEGER NOT NULL,
  status INTEGER NOT NULL,
  request_id TEXT NOT NULL
);
