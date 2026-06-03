-- Users table (AT Protocol identity)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    did TEXT UNIQUE NOT NULL,
    handle TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    privacy_default TEXT DEFAULT 'private' CHECK (privacy_default IN ('private', 'followers', 'public')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_did ON users(did);
CREATE INDEX idx_users_handle ON users(handle);

-- OAuth auth requests (for in-flight OAuth flows)
CREATE TABLE IF NOT EXISTS oauth_auth_requests (
    state TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth sessions (persistent token storage)
CREATE TABLE IF NOT EXISTS oauth_sessions (
    session_id TEXT PRIMARY KEY,
    did TEXT NOT NULL REFERENCES users(did) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oauth_sessions_did ON oauth_sessions(did);

-- Boards
CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    color_scheme JSONB DEFAULT '{"empty": "#ebedf0", "levels": ["#9be9a8", "#40c463", "#30a14e", "#216e39"]}',
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'followers', 'public')),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_boards_user_id ON boards(user_id);

-- Habits
CREATE TYPE habit_type AS ENUM ('binary', 'quantitative', 'timed');

CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    type habit_type NOT NULL DEFAULT 'binary',
    target_value NUMERIC DEFAULT 1,
    unit TEXT DEFAULT '',
    frequency JSONB DEFAULT '{"type": "daily"}',
    config JSONB DEFAULT '{}',
    position INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habits_board_id ON habits(board_id);

-- Entries (daily log entries)
CREATE TABLE IF NOT EXISTS entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    value_bool BOOLEAN,
    value_numeric NUMERIC,
    value_duration INTERVAL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, date)
);

CREATE INDEX idx_entries_habit_id ON entries(habit_id);
CREATE INDEX idx_entries_date ON entries(date);
CREATE INDEX idx_entries_habit_date ON entries(habit_id, date);

-- Streaks (materialized for performance)
CREATE TABLE IF NOT EXISTS streaks (
    habit_id UUID PRIMARY KEY REFERENCES habits(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed_at DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social: follows
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
