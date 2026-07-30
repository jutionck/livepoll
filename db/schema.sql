-- PostgreSQL Schema for Live Polling App

-- 1. Table for Sessions
CREATE TABLE IF NOT EXISTS sessions (
    code VARCHAR(10) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    active_question_id VARCHAR(50),
    active_question_activated_at INTEGER,
    host_token_hash VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 2. Table for Questions
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(10) REFERENCES sessions(code) ON DELETE CASCADE,
    q_id VARCHAR(50) NOT NULL, -- e.g. 'q1', 'q2'
    type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'multiple_selection', 'rating'
    title TEXT NOT NULL,
    options JSONB DEFAULT '{}'::jsonb, -- e.g. {"a": "Option A", "b": "Option B"}
    timer INTEGER DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (session_code, q_id)
);

-- 3. Table for Votes
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(10) REFERENCES sessions(code) ON DELETE CASCADE,
    question_id VARCHAR(50) NOT NULL, -- q_id referencing questions
    participant_id VARCHAR(100) NOT NULL,
    vote JSONB NOT NULL, -- can be string (single choice), array (multi choice), or integer (rating)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (session_code, question_id, participant_id)
);

-- Indexing for fast aggregates
CREATE INDEX IF NOT EXISTS idx_votes_lookup ON votes(session_code, question_id);
