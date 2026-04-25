ALTER TABLE t_p34636560_messenger_nickname_p.messages
  ADD COLUMN media_url TEXT,
  ADD COLUMN media_type VARCHAR(20);

CREATE TABLE t_p34636560_messenger_nickname_p.signaling (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES t_p34636560_messenger_nickname_p.users(id),
    to_user_id INTEGER NOT NULL REFERENCES t_p34636560_messenger_nickname_p.users(id),
    type VARCHAR(20) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    consumed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_signaling_to ON t_p34636560_messenger_nickname_p.signaling(to_user_id, consumed);
