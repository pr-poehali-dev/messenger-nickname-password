CREATE TABLE t_p34636560_messenger_nickname_p.messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES t_p34636560_messenger_nickname_p.users(id),
    to_user_id INTEGER NOT NULL REFERENCES t_p34636560_messenger_nickname_p.users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_messages_from ON t_p34636560_messenger_nickname_p.messages(from_user_id);
CREATE INDEX idx_messages_to ON t_p34636560_messenger_nickname_p.messages(to_user_id);
CREATE INDEX idx_messages_created ON t_p34636560_messenger_nickname_p.messages(created_at);
