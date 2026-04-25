CREATE TABLE t_p34636560_messenger_nickname_p.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p34636560_messenger_nickname_p.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p34636560_messenger_nickname_p.users(id),
    token VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_sessions_token ON t_p34636560_messenger_nickname_p.sessions(token);
CREATE INDEX idx_sessions_user_id ON t_p34636560_messenger_nickname_p.sessions(user_id);
