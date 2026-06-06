-- Drop the foreign key constraint on oauth_sessions.did
-- The Indigo SDK's ProcessCallback persists the session before the app
-- upserts the user into the users table. oauth_sessions is the SDK's
-- raw token store and should not depend on application user records.
ALTER TABLE oauth_sessions
DROP CONSTRAINT IF EXISTS oauth_sessions_did_fkey;
