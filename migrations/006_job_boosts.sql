-- Manual payment records for boosting job posts

CREATE TABLE IF NOT EXISTS job_boosts (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AZN',
  status TEXT NOT NULL DEFAULT 'PENDING_MANUAL_CONFIRMATION',
  reference TEXT UNIQUE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
