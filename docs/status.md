# Project Status — LifeTrack

**Last updated**: 2026-06-05

---

## Phase 1: Core Habit Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| AT Protocol OAuth login | In Progress | Public localhost client (`NewLocalhostConfig`). Patched Indigo SDK to omit empty `client_assertion` fields. Uses `127.0.0.1` per RFC 8252. |
| User model + persistence | Ready | `users`, `oauth_sessions`, `oauth_auth_requests` tables |
| Board CRUD | Ready | Create, read, update, delete boards with color schemes |
| Habit CRUD | Ready | Binary, quantitative, timed habit types |
| Daily entry logging | Ready | One entry per habit per date |
| Heatmap visualization | Ready | Board-level heatmap endpoint + frontend component |
| Streak tracking | Ready | Materialized `streaks` table with current/longest |
| PWA setup | Ready | `vite-plugin-pwa` configured |
| JWT middleware | Ready | Cookie + Bearer header support |
| Database migrations | Ready | Auto-runs on server startup |

---

## Phase 2: Enhanced Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| Custom color schemes | Planned | Schema supports JSONB `color_scheme` per board |
| Habit templates | Planned | Not yet implemented |
| Rest days | Planned | Not yet implemented |
| Composite boards | Planned | Not yet implemented |

---

## Phase 3: Social

| Feature | Status | Notes |
|---------|--------|-------|
| Follow/unfollow | Partial | `follows` table exists in schema; no API endpoints yet |
| Public boards | Planned | Visibility enum exists (`private`, `followers`, `public`) |
| Leaderboards | Planned | Not yet implemented |
| Streak rankings | Planned | Not yet implemented |

---

## Phase 4: Polish

| Feature | Status | Notes |
|---------|--------|-------|
| Analytics | Planned | Not yet implemented |
| Data export | Planned | Not yet implemented |
| Dark/light theming | Planned | Not yet implemented |
| Mobile optimizations | Planned | PWA base exists; UI optimizations pending |

---

## Infrastructure Status

| Component | Status |
|-----------|--------|
| Backend server | Compiles (Go 1.26 + Chi) |
| PostgreSQL | Schema migrated (`000001_init`) |
| Frontend dev server | Running (Vite) |
| Docker setup | `docker-compose` available for db + backend |
| Migrations | `golang-migrate` integrated |
| OAuth SDK patch | Applied — `docker/patch-indigo.sh` fixes empty `client_assertion` encoding |
| Go toolchain | 1.26.4 at `/usr/local/go/bin/go` (system `go` is 1.22.2) |

---

## Known Issues
- **OAuth login 500 error** — Root cause is an Indigo SDK bug: `PushedAuthRequest` uses plain `string` (no `omitempty`) for `client_assertion`/`client_assertion_type`, while `InitialTokenRequest` correctly uses `*string` with `omitempty`. Empty strings encode as `client_assertion=&client_assertion_type=`, rejected by Bluesky. **Fixed** by patching the SDK (`docker/patch-indigo.sh`) and reverting to `NewLocalhostConfig` (public client).
- **RFC 8252 loopback compliance** — Bluesky rejects `localhost` in `redirect_uri`; must use `127.0.0.1`. All URLs switched accordingly.
- **Go toolchain split** — System `go` is 1.22.2 (too old for Indigo SDK). Go 1.26.4 installed at `/usr/local/go/bin/go`. `go.mod` updated to `go 1.26`.

## Current Blockers
- **43 uncommitted files** — All OAuth fixes, SDK patch, UI polish, migration 000002, and documentation from June 3 exist only on local disk. **Must commit before any further development.**
- **OAuth never tested end-to-end** — The patch is theoretical until a real Bluesky handle logs in successfully.
- **Zero tests** — No unit or integration tests for streak calculation, auth flow, or CRUD operations.

## Next Priority
1. **Commit all uncommitted work** (43 files) — critical risk mitigation.
2. **Test OAuth end-to-end** with a real Bluesky handle at `http://127.0.0.1:5173`.
3. **Smoke test Phase 1 features** — board/habit/entry CRUD, heatmap, streaks.
4. **Fix silent errors** — `json.Unmarshal` and goroutine errors are swallowed.
5. Continue Phase 2 features only after Phase 1 is verified working.
