-- Re-add the foreign key constraint
ALTER TABLE oauth_sessions
ADD CONSTRAINT oauth_sessions_did_fkey
FOREIGN KEY (did) REFERENCES users(did) ON DELETE CASCADE;
