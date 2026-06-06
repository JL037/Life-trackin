-- Remove bio and goals fields from users table
ALTER TABLE users DROP COLUMN IF EXISTS bio;
ALTER TABLE users DROP COLUMN IF EXISTS goals;
