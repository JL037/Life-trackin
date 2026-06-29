# LifeTrack Backend — Status & Roadmap

> **Last updated:** 2026-06-05  
> **Go version:** 1.26  
> **Module:** `github.com/jaredlemler/life-trackin`

---

## 1. Executive Summary

The LifeTrack backend is a **production-grade Go API** built with Chi, pgx, and AT Protocol OAuth. It powers habit tracking with boards, daily entries, streak computation, and public profile sharing. The core domain logic is functional and the auth flow is end-to-end working via Bluesky/AT Protocol handles.

**Current phase:** Core functionality complete (Auth, Boards, Habits, Entries, Streaks, Public Profiles).  
**Next phase:** Hardening, social features, and developer experience.

---

## 2. Architecture Overview

```
backend/
├── cmd/server/main.go          # Entry point, router, graceful shutdown
├── internal/
│   ├── auth/
│   │   ├── oauth.go            # Indigo SDK ClientApp init
│   │   └── store.go            # PGClientAuthStore (OAuth sessions & auth requests)
│   ├── db/
│   │   └── db.go               # pgxpool + golang-migrate runner
│   ├── handlers/
│   │   ├── auth.go             # Login, callback, me, update profile, logout
│   │   ├── boards.go           # Board CRUD + stats + heatmap
│   │   ├── habits.go           # Habit CRUD
│   │   ├── entries.go          # Entry logging + streak materialization
│   │   └── public.go           # Public user/board/stats (no auth)
│   ├── middleware/
│   │   └── auth.go             # JWT validation (cookie + Bearer header)
│   └── models/
│       └── models.go           # Shared Go structs
├── migrations/
│   ├── 000001_init.up.sql
│   ├── 000002_drop_oauth_sessions_fk.up.sql
│   └── 000003_add_user_profile_fields.up.sql
├── .air.toml                   # Live reload config
├── .env / .env.example
├── go.mod / go.sum
```

### Stack
| Layer | Technology |
|-------|-----------|
| Language | Go 1.26 |
| Router | Chi v5 |
| Database | PostgreSQL 16 (via pgx v5 pool) |
| Migrations | golang-migrate/v4 |
| Auth | AT Protocol OAuth (Indigo SDK) + JWT sessions |
| CORS | go-chi/cors |
| Live Reload | Air |

---

## 3. What Is Built (Completed)

### Auth & Identity
- [x] AT Protocol OAuth login (`/api/auth/login?handle=`)
- [x] OAuth callback handling with PKCE + PAR (Indigo SDK)
- [x] JWT session issuance (HTTP-only cookie `session_token` + `Authorization: Bearer` fallback)
- [x] `/api/auth/me` — current user profile
- [x] `PUT /api/auth/me` — update display name, bio, goals, privacy default
- [x] `/api/auth/logout` — cookie clear
- [x] `/client-metadata.json` — OAuth client metadata

### Boards
- [x] `GET /api/boards` — list with color scheme JSONB unmarshaling
- [x] `POST /api/boards` — create (defaults to GitHub-style green color scheme)
- [x] `GET /api/boards/{boardID}` — get single
- [x] `PUT /api/boards/{boardID}` — dynamic partial update
- [x] `DELETE /api/boards/{boardID}` — delete
- [x] `GET /api/boards/{boardID}/stats` — aggregate stats (habit count, streaks, entries)
- [x] `GET /api/boards/{boardID}/heatmap?year=` — full-year daily completion heatmap

### Habits
- [x] `GET /api/boards/{boardID}/habits` — list active habits
- [x] `POST /api/boards/{boardID}/habits` — create (binary/quantitative/timed)
- [x] `GET /api/habits/{habitID}` — get single
- [x] `PUT /api/habits/{habitID}` — dynamic partial update
- [x] `DELETE /api/habits/{habitID}` — delete
- [x] Habit types: `binary`, `quantitative`, `timed`
- [x] Frequency & config stored as JSONB
- [x] Position field for ordering
- [x] Archived boolean soft-filter

### Entries
- [x] `POST /api/habits/{habitID}/entries` — upsert (one per habit per date via `ON CONFLICT`)
- [x] `GET /api/habits/{habitID}/entries?from=&to=` — date-range list
- [x] `GET /api/habits/{habitID}/streak` — current/longest streak + total completed
- [x] `DELETE /api/entries/{entryID}` — delete + streak recalculation
- [x] Interval-based duration storage (`value_duration`)

### Public API (No Auth)
- [x] `GET /api/public/users/{handle}` — public profile
- [x] `GET /api/public/users/{handle}/boards` — public boards only
- [x] `GET /api/public/boards/{boardID}/stats` — public board stats

### Data Integrity
- [x] One entry per habit per date (`UNIQUE(habit_id, date)`)
- [x] Materialized streaks table (`streaks`)
- [x] Ownership checks on every mutation (JOIN through `boards.user_id`)
- [x] Parameterized pgx queries throughout
- [x] 3 migrations applied with rollback scripts

---

## 4. Technical Decisions & Patterns

1. **Thin handlers, but no service layer yet.** Handlers talk directly to `pgxpool`. This was fine for rapid development but will need abstraction as complexity grows.
2. **Materialized streaks.** Streaks are computed in Go and written to `streaks` table asynchronously (`go h.updateStreak(...)`). This avoids expensive window-function queries on every read.
3. **Dynamic SQL for partial updates.** `PUT` endpoints build parameterized queries based on which JSON fields are present. This keeps the API flexible but increases handler verbosity.
4. **JWT over custom sessions.** We issue our own JWT after AT Protocol OAuth succeeds. The Indigo SDK session is stored separately for token refresh and AT Protocol API calls.
5. **Cookie-first auth.** `session_token` HTTP-only cookie with Lax SameSite. Bearer header fallback for mobile/API consumers.
6. **Public client OAuth.** Uses `NewLocalhostConfig` (virtual metadata) for development. The Indigo SDK patch handles `client_assertion` pointer types.

---

## 5. Known Gaps & Technical Debt

| Priority | Issue | Impact |
|----------|-------|--------|
| **High** | No tests (`*_test.go` missing) | Regression risk, slows refactors |
| **High** | Cookie `Domain: "127.0.0.1"` and `Secure: false` hardcoded | Production deployment blocker |
| **High** | Streak update goroutine has no request context / panic recovery | Can leak goroutines or crash on DB errors |
| **Medium** | No structured logging (stdlib `log.Printf` only) | Hard to debug in production, no correlation IDs |
| **Medium** | No rate limiting | Login and public endpoints vulnerable to brute force / scraping |
| **Medium** | No input validation library | Manual checks per handler; inconsistent error shapes |
| **Medium** | `follows` table exists but zero API endpoints | Schema is dead code |
| **Low** | No health check beyond `"status":"ok"` | Doesn't verify DB connectivity |
| **Low** | No API documentation (OpenAPI/Swagger) | Frontend and mobile devs must read source |
| **Low** | No metrics/observability hooks | No visibility into latency, error rates, DB pool saturation |
| **Low** | `updateStreak` re-queries all entries; could be optimized | O(n) streak calc on every entry mutation |

---

## 6. Immediate Next Steps (Short Term)

1. **Write handler tests** using `httptest` + `pgxmock` or a test PostgreSQL container.
2. **Fix production cookie config** — make `Domain`, `Secure`, and `SameSite` environment-driven.
3. **Add panic recovery + context to streak goroutine** — pass a derived context and recover from panics.
4. **Add structured logging** — introduce `slog` with JSON output and request-scoped attributes.
5. **Add rate limiting** — per-IP on login/public routes; per-user on write routes.
6. **Health check v2** — `/health` should `pool.Ping()` the database.
7. **Input validation** — introduce a small validation helper or lightweight library to standardize request body errors.

---

## 7. Medium Term Roadmap (3–6 Months)

### Social & Privacy
- `POST /api/follows/{handle}` + `DELETE /api/follows/{handle}`
- `GET /api/follows` — following & followers lists
- `GET /api/feed` — aggregated activity from followed users
- Board-level visibility enforcement on all endpoints (currently only public API filters)

### Notifications & Activity
- AT Protocol app-bsky notification integration (post streak milestones to Bluesky optionally)
- WebSocket or SSE endpoint for real-time entry updates across sessions
- Push notification token registration endpoint (for future mobile app)

### Data Portability
- `GET /api/export` — full account export (JSON + CSV)
- Import endpoint for Loop Habit Tracker / other apps

### Developer Experience
- OpenAPI 3.1 spec generation (via `chi` reflect or manual YAML)
- API versioning strategy (`/api/v1/...` or `Accept` header)
- Pagination on `List` endpoints (cursor-based)

### Performance
- Redis cache layer for heatmaps and public stats
- Database query optimization (composite indexes, `streaks` incremental update instead of full recalc)
- Connection pool tuning based on load testing

---

## 8. Future Ideas (Long Term / Vision)

### Platform & Ecosystem
- **AT Protocol Sync:** Post daily summaries, streak achievements, or monthly recaps directly to the user's Bluesky account (with explicit consent).
- **Embeddable Widgets:** Public heatmap iframe snippet that users can embed in blogs or GitHub profiles.
- **API Keys:** Allow third-party integrations (Zapier, IFTTT, Siri Shortcuts) to push entries via scoped API keys.
- **Webhooks:** Let users configure webhooks on streak milestones or daily reminders.

### AI & Insights
- **Trend Analysis API:** `/api/insights` returns correlation suggestions (e.g., "You complete 23% more habits on days after 7+ hours of sleep" if sleep data is linked).
- **Habit Recommendations:** Suggest new habits based on patterns from similar public boards (anonymized).
- **Predictive Streak Risk:** Warn users before a streak is likely to break based on historical patterns.

### Collaboration & Community
- **Collaborative Boards:** Multiple users can contribute entries to a shared board (fitness challenges, team goals).
- **Templates Marketplace:** Curated habit board templates ("Morning Routine", "Marathon Training", "30-Day Coding Challenge") with one-click import.
- **Challenges / Competitions:** Time-bound leaderboards between friends or public participants.

### Mobile & Offline
- **Sync Protocol:** Conflict-free Replicated Data Type (CRDT) or timestamp-based sync for offline-first mobile clients.
- **Batch Entry Endpoint:** `POST /api/batch/entries` for mobile sync queues.
- **Image Attachments:** Allow photo proof on entries (S3/R2 presigned upload URLs).

### Calendar & Wearables
- **Calendar Integrations:** Google Calendar / Apple HealthKit write-back for completed habits.
- **Wearable Webhooks:** Receive events from Garmin, Fitbit, Apple Watch to auto-log quantitative habits.

### Monetization & Sustainability
- **Premium Features Flag:** `users.plan` field for future tiered features (unlimited boards, advanced insights).
- **Donation Integration:** AT Protocol payment pointers or Stripe for supporter badges.

---

## 9. Database Schema at a Glance

```sql
users                    -- UUID PK, did (UNIQUE), handle, profile fields
oauth_auth_requests      -- state PK, JSONB data
oauth_sessions           -- session_id PK, did, JSONB data
boards                   -- UUID PK, user_id FK, name, color_scheme JSONB, visibility
habits                   -- UUID PK, board_id FK, type ENUM, target_value, frequency/config JSONB
entries                  -- UUID PK, habit_id FK, date, value_bool/numeric/duration, UNIQUE(habit_id, date)
streaks                  -- habit_id PK FK, current/longest streak, last_completed_at
follows                  -- (follower_id, following_id) composite PK — schema only, no handlers yet
```

---

## 10. Infrastructure & Ops Status

| Concern | Status | Notes |
|---------|--------|-------|
| Live reload | Configured | Air `.air.toml` present |
| Environment config | `.env` based | `godotenv` loaded in `main.go` |
| Migrations | Auto-run on startup | `db.RunMigrations` called in `main.go` |
| Docker | Not present in backend dir | Needs `Dockerfile` + compose service |
| TLS / HTTPS | Not handled | Terminate at reverse proxy (nginx/traefik) |
| Secrets management | Env vars only | No Vault / 1Password / Doppler integration yet |
| CI/CD | None | No GitHub Actions, no lint gate, no test runner |

---

## 11. Quick Stats

- **Go files:** 11
- **Total lines of Go:** ~2,400
- **Migrations:** 3 (up + down pairs)
- **Database tables:** 7
- **API endpoints:** ~22
- **Test coverage:** 0%
- **External dependencies:** 13 direct + indirect

---

## 12. How to Run

```bash
cd backend
# Ensure PostgreSQL 16 is running and DATABASE_URL is set
cp .env.example .env
# Edit .env if needed

# Run migrations and start server
/usr/local/go/bin/go run ./cmd/server/main.go

# Or use Air for live reload
air
```

---

*This document should be updated after every significant milestone or sprint. The next update target: after test coverage is introduced and social endpoints are shipped.*
