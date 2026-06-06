-- Add bio and goals fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS goals TEXT DEFAULT '';
