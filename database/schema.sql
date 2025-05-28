-- Create database (run this first)
-- CREATE DATABASE mindful_space;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(50),
    bio TEXT,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moods table
CREATE TABLE moods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    mood VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Gratitudes table
CREATE TABLE gratitudes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal entries table
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friend requests table
CREATE TABLE friend_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    requested_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, requested_id)
);

-- Create indexes for better performance
CREATE INDEX idx_moods_user_date ON moods(user_id, date);
CREATE INDEX idx_gratitudes_user_date ON gratitudes(user_id, date);
CREATE INDEX idx_journal_user_created ON journal_entries(user_id, created_at);
CREATE INDEX idx_journal_public_created ON journal_entries(is_public, created_at);
CREATE INDEX idx_friend_requests_requester ON friend_requests(requester_id);
CREATE INDEX idx_friend_requests_requested ON friend_requests(requested_id);

-- Insert sample users (optional)
INSERT INTO users (name, email, password, age, gender, bio, profile_complete) VALUES
('Sarah Johnson', 'sarah@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 28, 'female', 'Mental health advocate and yoga enthusiast. Finding peace in mindfulness.', true),
('Michael Chen', 'michael@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 34, 'male', 'Meditation practitioner and wellness coach. Here to support and grow.', true),
('Emma Rodriguez', 'emma@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 25, 'female', 'Art therapy student learning to heal through creativity and community.', true);

-- Insert sample journal entries
INSERT INTO journal_entries (user_id, content, category, is_public) VALUES
(1, 'Today I practiced gratitude meditation for 20 minutes. It helped me center myself and appreciate the small moments of joy in my day. The morning sunlight through my window felt like a warm hug.', 'mindfulness', true),
(2, 'Dealing with work stress has been challenging lately. I''ve been using breathing exercises and they really help. Remember: this too shall pass. Taking it one day at a time.', 'stress', true),
(3, 'Art therapy session today was incredible. I painted my emotions and it felt so liberating. Colors have a way of expressing what words cannot. Feeling grateful for this healing journey.', 'personal-growth', true);
