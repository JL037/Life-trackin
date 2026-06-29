# Backend → Frontend Handoff

> **Session:** 2026-06-06
> **Backend changes delivered:** 8 goals completed (tests, cookies, streak hardening, logging, rate limiting, health check, validation, social features)

---

## 1. New API Endpoints (Frontend Must Build For)

### Social Features

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|--------------|----------|
| `POST` | `/api/follows/{handle}` | Required | Follow a user by handle | — | `{"status":"followed"}` |
| `DELETE` | `/api/follows/{handle}` | Required | Unfollow a user by handle | — | `{"status":"unfollowed"}` |
| `GET` | `/api/follows?type=following` | Required | List users **you** follow | — | `{"type":"following","users":[...],"count":N}` |
| `GET` | `/api/follows?type=followers` | Required | List users following **you** | — | `{"type":"followers","users":[...],"count":N}` |
| `GET` | `/api/feed?limit=50` | Required | Activity feed from followed users | — | `{"items":[...],"count":N}` |

#### Follows User Object
```json
{
  "id": "uuid",
  "handle": "alice.bsky.social",
  "display_name": "Alice",
  "avatar_url": "",
  "followed_at": "2026-06-06T12:00:00Z"
}
```

#### Feed Item Object
```json
{
  "id": "entry-uuid",
  "user_id": "user-uuid",
  "handle": "alice.bsky.social",
  "display_name": "Alice",
  "board_id": "board-uuid",
  "board_name": "Fitness",
  "habit_id": "habit-uuid",
  "habit_name": "Morning Run",
  "entry_id": "entry-uuid",
  "entry_date": "2026-06-05",
  "value_bool": true,
  "value_numeric": null,
  "notes": "Felt great",
  "created_at": "2026-06-05T08:00:00Z"
}
```

> **Visibility rule:** The feed only includes entries from boards with `visibility` = `public` or `followers`. Private boards are excluded even if you follow the user.

---

## 2. Error Response Changes (Frontend Must Handle)

### Validation Errors — New Shape
Board and Habit creation now use a centralized validator. Instead of flat `"name is required"` strings, validation errors now return:

```json
{
  "error": "validation failed",
  "fields": {
    "name": ["is required"],
    "visibility": ["must be one of [private public followers]"],
    "target_value": ["must be non-negative"]
  }
}
```

**Affected endpoints:**
- `POST /api/boards`
- `POST /api/boards/{boardID}/habits`

**Action needed:** Update your form error display to parse the `"fields"` object and map messages to individual inputs.

### Rate Limiting — 429 Responses
The backend now enforces rate limits:

| Scope | Limit | Applies To |
|-------|-------|------------|
| Per IP | 30 req/min | `/api/auth/*`, `/api/public/*` |
| Per User | 60 req/min | All write routes (`POST`, `PUT`, `DELETE`) under `/api/*` |

**429 Response:**
```json
{"error":"rate limit exceeded"}
```

**Action needed:** Show a user-friendly "Too many requests, please slow down" message when receiving HTTP 429. Consider adding client-side debouncing on rapid clicks.

---

## 3. Behavior Changes (No API breakage, but note)

### Health Check
`/health` now pings the database. If the DB is down it returns:
```json
{"status":"unhealthy","check":"database"}
```
with HTTP 503. Previously it always returned `{"status":"ok"}`.

### Cookie Configuration
Session cookies are now fully environment-driven. In development they still behave the same (`Domain=""`, `Secure=false`, `SameSite=Lax`). In production the backend will set `Secure=true` and the production domain. **No frontend code change required** — the cookie is still named `session_token`.

---

## 4. No-Op Changes (Frontend can ignore)

The following improvements are internal only and do not affect the API contract:

- **Test suite** — 71 backend tests added; no API changes.
- **Streak goroutine hardening** — Panic recovery + context propagation on background streak updates.
- **Structured logging** — JSON logs via `slog`; no request/response changes.

---

## 5. Recommended Frontend Work

| Priority | Task |
|----------|------|
| **High** | Build **Follow/Unfollow** buttons on user profile pages (`/public/users/{handle}`). |
| **High** | Create a **Social/Following** page with tabs for "Following" and "Followers". |
| **High** | Build an **Activity Feed** page (`/feed`) showing recent entries from followed users. |
| **Medium** | Update form validation UI to render field-level errors from the `"fields"` object on board/habit creation. |
| **Medium** | Add a global 429 error toast/banner for rate limit exceeded. |
| **Low** | Add a loading skeleton for feed items since the feed query is a multi-table join. |

---

## 6. Quick Reference: New Routes Summary

```
POST   /api/follows/{handle}          → Follow user
DELETE /api/follows/{handle}          → Unfollow user
GET    /api/follows?type=following    → List following
GET    /api/follows?type=followers     → List followers
GET    /api/feed?limit=50              → Activity feed
```

All social routes require the `session_token` cookie or `Authorization: Bearer <token>` header (same auth as existing protected routes).

---

*Questions? Ping the backend team.*
