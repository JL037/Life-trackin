# AT Protocol OAuth Implementation Guide for LifeTrack

> **Reference Docs**
> - [AT Protocol OAuth Spec](https://atproto.com/specs/oauth)
> - [Bluesky Indigo SDK — `atproto/auth/oauth`](https://pkg.go.dev/github.com/bluesky-social/indigo/atproto/auth/oauth)

---

## The Bug We Hit

When testing login with `jaredlemler.com`, the backend returned:

```
{"error":"Failed to get auth server: auth server metadata fetch failed: status 404"}
```

**Root cause**: We tried to fetch `/.well-known/oauth-authorization-server` directly from the PDS URL (`https://bsky.social`). Bluesky's PDS does **not** serve that endpoint. It returns 404.

---

## Why It Failed — The AT Protocol Discovery Chain

The AT Protocol OAuth spec defines a **two-step discovery process** that we skipped.

### Step 1: Resolve Handle → DID → PDS URL

This part we got right:

1. Handle (`jaredlemler.com`) → resolved via `com.atproto.identity.resolveHandle` on `bsky.social`
2. DID document fetched from PLC directory (`https://plc.directory/`)
3. PDS service endpoint extracted from DID document (`https://bsky.social`)

### Step 2: Resource Server Metadata → Authorization Server Metadata ← **WE SKIPPED THIS**

Per the [AT Protocol OAuth spec — Authorization Servers / Server Metadata](https://atproto.com/specs/oauth#authorization-servers):

> **Resource Server (PDS) metadata** must comply with the "OAuth 2.0 Protected Resource Metadata" draft. The URL path is `/.well-known/oauth-protected-resource`. It must contain an `authorization_servers` array with a single element — the fully-qualified URL of the Authorization Server.

The **Authorization Server** may be the **same origin** as the Resource Server (PDS), or might point to a **separate server** (e.g., an entryway).

> **Authorization Server metadata** complies with RFC 8414. The URL path is `/.well-known/oauth-authorization-server`. But this endpoint lives on the **Authorization Server**, not necessarily on the PDS.

### What We Should Have Done

```
Handle → DID → PDS URL
                        ↓
          GET /.well-known/oauth-protected-resource  (on PDS)
                        ↓
          Extract authorization_servers[0] → Auth Server URL
                        ↓
          GET /.well-known/oauth-authorization-server  (on Auth Server)
                        ↓
          Now we have: issuer, authorization_endpoint, token_endpoint, PAR endpoint, etc.
```

For Bluesky accounts hosted on `bsky.social`:
- PDS = `https://bsky.social`
- Resource Server metadata at `https://bsky.social/.well-known/oauth-protected-resource`
- Auth Server might be `https://bsky.social` (same origin) or a separate entryway like `https:// entryway.bsky.app`

Our code naively appended `/.well-known/oauth-authorization-server` to the PDS URL and fetched it. That works only when the Auth Server happens to be the same origin as the PDS. Bluesky's setup returns 404 because the metadata is served differently.

---

## The Correct Fix: Use the Indigo SDK's `ClientApp`

The Bluesky Indigo SDK (`github.com/bluesky-social/indigo/atproto/auth/oauth`) implements the full discovery chain correctly. We should use it instead of hand-rolling our own OAuth flow.

### Key Insight from the SDK Docs

> "Most OAuth client applications will use the high-level `ClientApp` and supporting interfaces to manage session logins, persistence, and token refreshes. Lower-level components are designed to be used in isolation if needed."

### What `ClientApp` Handles Automatically

1. **Identity resolution** — handle → DID → PDS URL (with proper bidirectional handle verification)
2. **Resource Server metadata discovery** — fetches `/.well-known/oauth-protected-resource`
3. **Authorization Server metadata discovery** — fetches `/.well-known/oauth-authorization-server` from the correct server
4. **PKCE** — generates verifier and challenge automatically
5. **PAR (Pushed Authorization Request)** — sends POST to the PAR endpoint, stores session data
6. **DPoP** — generates cryptographic keys, handles nonce rotation
7. **Token exchange** — exchanges code for tokens with full validation
8. **Session persistence** — persists `AuthRequestData` in a `ClientAuthStore`

### The Three-Handler Pattern (from SDK docs)

```go
// 1. Serve client metadata document
http.HandleFunc("GET /client-metadata.json", func(w http.ResponseWriter, r *http.Request) {
    doc := oauthApp.Config.ClientMetadata()
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(doc)
})

// 2. Start auth flow — resolves handle, sends PAR, returns redirect URL
http.HandleFunc("GET /oauth/login", func(w http.ResponseWriter, r *http.Request) {
    identifier := r.URL.Query().Get("handle") // or DID, or PDS URL
    redirectURL, err := oauthApp.StartAuthFlow(ctx, identifier)
    // redirect user to the Authorization Server
})

// 3. Handle callback — validates state, exchanges code for tokens
http.HandleFunc("GET /oauth/callback", func(w http.ResponseWriter, r *http.Request) {
    sessData, err := oauthApp.ProcessCallback(ctx, r.URL.Query())
    // sessData.AccountDID, sessData.SessionID, sessData.Scopes
})
```

---

## What We Need to Change

### 1. Replace `internal/auth/oauth.go`

Current: Custom `OAuthClient` struct with manual PKCE, state, and PostgreSQL store.

New: Use `oauth.NewClientApp()` with a custom `ClientAuthStore` that persists to PostgreSQL.

The `ClientAuthStore` interface requires four methods:
- `ReadClientAuth(state string) (*AuthRequestData, error)`
- `WriteClientAuth(data *AuthRequestData) error`
- `DeleteClientAuth(state string) error`
- `ListClientAuth(did string) ([]AuthRequestData, error)`

### 2. Replace `internal/handlers/auth.go`

Current: Manual `ResolveHandle` → `GetPDSFromDID` → `GetAuthServerMetadata` → custom PAR → custom token exchange.

New: Use `oauthApp.StartAuthFlow()` and `oauthApp.ProcessCallback()`.

### 3. Keep What Works

- JWT session management (our `middleware/auth.go` and cookie setting)
- User upsert logic in PostgreSQL
- `/api/auth/me` and `/api/auth/logout` endpoints
- Database schema (tables `users`, `oauth_auth_requests`, `oauth_sessions` still relevant)

### 4. Add `ClientAuthStore` Implementation

Create a PostgreSQL-backed implementation of the `oauth.ClientAuthStore` interface. This replaces our current `PGAuthStore`.

---

## Localhost Development Note

Per the [AT Protocol OAuth spec — Localhost Client Development](https://atproto.com/specs/oauth#localhost-client-development):

> "When working with a development environment, a special exception is made for clients with `client_id` having origin `http://localhost` (with no port number specified)."

For local development, our `client_id` should be `http://localhost/client-metadata.json` (or similar). The Authorization Server will generate a virtual client metadata document. This means we don't need to publicly host our `client-metadata.json` during development.

**Important**: The `redirect_uri` must be `http://localhost/` or `http://127.0.0.1/` — the SDK handles this automatically when configured with `http://localhost` as the base URL.

---

## Summary of Changes

| File | Action |
|------|--------|
| `internal/auth/oauth.go` | Replace custom `OAuthClient` with Indigo `ClientApp` + PostgreSQL `ClientAuthStore` |
| `internal/auth/resolve.go` | **Delete** — SDK handles all resolution |
| `internal/auth/pkce.go` | **Delete** — SDK handles PKCE |
| `internal/handlers/auth.go` | Refactor login/callback to use `ClientApp.StartAuthFlow` and `ProcessCallback` |
| `cmd/server/main.go` | Wire up `ClientApp` instead of custom `OAuthClient` |
| `internal/middleware/auth.go` | Keep as-is (JWT validation still works) |

---

## References

- [AT Protocol OAuth Spec](https://atproto.com/specs/oauth)
- [Indigo SDK OAuth Package](https://pkg.go.dev/github.com/bluesky-social/indigo/atproto/auth/oauth)
- [OAuth 2.0 Authorization Server Metadata (RFC 8414)](https://datatracker.ietf.org/doc/html/rfc8414)
- [OAuth 2.0 Protected Resource Metadata (draft)](https://datatracker.ietf.org/doc/draft-ietf-oauth-resource-metadata/)
