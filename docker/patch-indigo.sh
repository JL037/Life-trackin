#!/bin/sh
# Patch Indigo SDK v0.0.0-20260529183052-5368f55344e0
# Fixes: PushedAuthRequest sends empty client_assertion fields for public clients,
# causing Bluesky auth server to return invalid_request.
# InitialTokenRequest already uses *string with omitempty; this applies the same fix
# to PushedAuthRequest and its assignment in SendAuthRequest.

set -e

MOD_DIR="/go/pkg/mod/github.com/bluesky-social/indigo@v0.0.0-20260529183052-5368f55344e0/atproto/auth/oauth"

chmod -R +w "$MOD_DIR"

# types.go: change string fields to *string with omitempty
sed -i 's/ClientAssertionType string `url:"client_assertion_type"`/ClientAssertionType *string `url:"client_assertion_type,omitempty"`/' "$MOD_DIR/types.go"
sed -i 's/ClientAssertion string `url:"client_assertion"`/ClientAssertion *string `url:"client_assertion,omitempty"`/' "$MOD_DIR/types.go"

# oauth.go: assign pointers instead of values
sed -i 's/body.ClientAssertionType = ClientAssertionJWTBearer/body.ClientAssertionType = \&ClientAssertionJWTBearer/' "$MOD_DIR/oauth.go"
sed -i 's/body.ClientAssertion = assertionJWT/body.ClientAssertion = \&assertionJWT/' "$MOD_DIR/oauth.go"

echo "Indigo SDK patched successfully"
