# LifeTrack — Agent Knowledge Base

## Project Overview

**LifeTrack** is a GitHub-style life tracking PWA built on the AT Protocol. Users sign in with their Bluesky handle (AT Protocol OAuth), create tracking boards, define habits (binary, quantitative, or timed), log daily entries, and view GitHub-style heatmap visualizations.

| Attribute | Value |
|-----------|-------|
| **Name** | LifeTrack |
| **Stack** | Go (backend) + React/TypeScript (frontend) + PostgreSQL |
| **Auth** | AT Protocol DID-based OAuth via Bluesky Indigo SDK |
| **Phase** | Phase 1 (core habit tracking) |
| **License** | MIT |

---

## Directory Structure

```
Life-trackin/
├── backend/
│   ├── cmd/server/
│   │   └── main.go              # Entry point, router setup, graceful shutdown
│   ├── internal/
│   │   ├── auth/
│   │   │   ├── oauth.go         # OAuthClient + PGAuthStore (session persistence)
│   │   │   ├── pkce.go          # PKCE code verifier generation
│   │   │   └── resolve.go       # AT Protocol handle → DID + PDS discovery
│   │   ├── db/
│   │   │   └── db.go            # pgxpool connection + golang-migrate runner
│   │   ├── handlers/
│   │   │   ├── auth.go          # Login, callback, me, logout handlers
│   │   │   ├── boards.go        # Board CRUD + heatmap aggregation
│   │   │   ├── habits.go        # Habit CRUD
│   │   │   └── entries.go       # Entry logging + streak computation
│   │   ├── middleware/
│   │   │   └── auth.go          # JWT validation (cookie + Bearer header)
│   │   └── models/
│   │       └── models.go        # Go structs matching DB schema
│   ├── migrations/
│   │   ├── 000001_init.up.sql   # Schema: users, oauth_*, boards, habits, entries, streaks, follows
│   │   └── 000001_init.down.sql # Drop all tables + enum type
│   └── .env                     # DATABASE_URL, PORT, APP_URL, FRONTEND_URL, JWT_SECRET
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Router + auth-gated rendering
│   │   ├── main.tsx             # React DOM mount
│   │   ├── components/
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── BoardCard.tsx
│   │   │   ├── CheckInModal.tsx
│   │   │   ├── CreateBoardModal.tsx
│   │   │   ├── CreateHabitModal.tsx
│   │   │   ├── EntryForm.tsx
│   │   │   ├── HabitCard.tsx
│   │   │   ├── Heatmap.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── StreakBadge.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts        # Generic async data hook
│   │   │   └── useAuth.ts       # Auth state + login/logout
│   │   ├── lib/
│   │   │   └── api.ts           # Typed fetch wrappers for all API endpoints
│   │   ├── pages/
│   │   │   ├── BoardView.tsx    # Single board detail + habits list
│   │   │   ├── Dashboard.tsx    # Boards overview
│   │   │   ├── HabitView.tsx    # Habit detail + entries + streak
│   │   │   └── Login.tsx        # Handle input + initiate OAuth
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces for all entities
│   │   └── index.css            # Tailwind v4 imports + base styles
│   ├── package.json             # React 19, Vite 8, Tailwind v4, react-router-dom v7
│   ├── vite.config.ts           # PWA plugin + Tailwind CSS Vite plugin
│   └── index.html
├── docker/
│   └── backend.Dockerfile
├── docs/                        # Documentation & worklogs (monthly/daily)
└── README.md
```

---

## Technology Stack

### Backend
| Component | Technology |
|-----------|------------|
| Language | Go 1.24+ |
| Router | `github.com/go-chi/chi/v5` |
| Database | PostgreSQL 16+ |
| Driver | `github.com/jackc/pgx/v5/pgxpool` |
| Migrations | `github.com/golang-migrate/migrate/v4` |
| Auth (AT Protocol) | `github.com/bluesky-social/indigo` |
| JWT | `github.com/golang-jwt/jwt/v5` |
| CORS | `github.com/go-chi/cors` |
| Env | `github.com/joho/godotenv` |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 19 + Vite 8 |
| Language | TypeScript ~6.0 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Routing | `react-router-dom` v7 |
| Icons | `lucide-react` |
| PWA | `vite-plugin-pwa` |
| Utilities | `clsx`, `tailwind-merge` |

---

## Data Model

### Database Schema

**`users`** — AT Protocol identity
- `id` (UUID PK), `did` (TEXT UNIQUE), `handle` (TEXT)
- `display_name`, `avatar_url`, `privacy_default`
- `created_at`, `updated_at`

**`oauth_auth_requests`** — In-flight OAuth flows
- `state` (TEXT PK), `data` (JSONB), `created_at`

**`oauth_sessions`** — Persistent token storage
- `session_id` (TEXT PK), `did` (FK → users.did), `data` (JSONB)

**`boards`** — Tracking boards
- `id` (UUID PK), `user_id` (FK → users.id)
- `name`, `description`, `color_scheme` (JSONB), `visibility`, `position`

**`habits`** — Individual trackables
- `id` (UUID PK), `board_id` (FK → boards.id)
- `name`, `description`, `type` (ENUM: binary|quantitative|timed)
- `target_value` (NUMERIC), `unit`, `frequency` (JSONB), `config` (JSONB)
- `position`, `archived`

**`entries`** — Daily log entries
- `id` (UUID PK), `habit_id` (FK → habits.id)
- `date` (DATE), `value_bool`, `value_numeric`, `value_duration` (INTERVAL)
- `notes`
- UNIQUE(`habit_id`, `date`)

**`streaks`** — Materialized streak cache
- `habit_id` (PK FK → habits.id), `current_streak`, `longest_streak`, `last_completed_at`

**`follows`** — Social graph (Phase 3)
- `follower_id` + `following_id` (composite PK)

---

## API Endpoints

### Auth (public)
- `GET /client-metadata.json` — OAuth client metadata
- `GET /api/auth/login?handle={handle}` — Initiate AT Protocol OAuth
- `GET /api/auth/callback` — OAuth callback
- `GET /api/auth/me` — Current user (requires auth)
- `POST /api/auth/logout` — Clear session

### Boards (protected)
- `GET /api/boards` — List user boards
- `POST /api/boards` — Create board
- `GET /api/boards/{id}` — Get board
- `PUT /api/boards/{id}` — Update board
- `DELETE /api/boards/{id}` — Delete board
- `GET /api/boards/{id}/heatmap?year=` — Board-level heatmap

### Habits (protected)
- `GET /api/boards/{id}/habits` — List board habits
- `POST /api/boards/{id}/habits` — Create habit
- `GET /api/habits/{id}` — Get habit
- `PUT /api/habits/{id}` — Update habit
- `DELETE /api/habits/{id}` — Delete habit

### Entries (protected)
- `POST /api/habits/{id}/entries` — Log entry
- `GET /api/habits/{id}/entries?from=&to=` — List entries
- `GET /api/habits/{id}/streak` — Get streak info
- `DELETE /api/entries/{id}` — Delete entry

---

## Authentication Flow

1. User enters Bluesky handle on Login page
2. Frontend redirects to `GET /api/auth/login?handle=`
3. Backend resolves handle → DID → PDS via AT Protocol
4. Backend generates PKCE verifier + PAR request
5. Redirect to AT Protocol OAuth authorization server
6. User authorizes on their PDS / OAuth provider
7. Callback to `GET /api/auth/callback` with authorization code
8. Backend exchanges code for access token (DPoP-bound)
9. JWT session cookie set; user record upserted in DB
10. Frontend checks `GET /api/auth/me` on load

**JWT claims**: `sub` (user UUID), `did` (AT Protocol DID)
**Session storage**: HTTP-only cookie (`session_token`) or `Authorization: Bearer` header

---

## Key Configuration

### Backend `.env`
```
DATABASE_URL=postgres://lifetrack:lifetrack_dev@localhost:5432/lifetrack?sslmode=disable
PORT=8080
APP_URL=http://127.0.0.1:8080
FRONTEND_URL=http://127.0.0.1:5173
JWT_SECRET=dev-secret-change-in-production
```

### CORS
Backend allows the configured `FRONTEND_URL` origin with credentials.

---

## Frontend Architecture

### Routing (`App.tsx`)
| Route | Page |
|-------|------|
| `/` / `/dashboard` | `Dashboard` — boards grid |
| `/board/:boardId` | `BoardView` — habits within board |
| `/habit/:habitId` | `HabitView` — entries + streak + heatmap |
| (unauthenticated) | `Login` — handle input |

### State Management
- **Auth**: `useAuth` hook checks `/api/auth/me` on mount; null → redirect to login
- **API**: `useApi` generic hook for async data fetching with loading/error states
- **Data fetching**: `lib/api.ts` provides typed endpoint wrappers using `fetch` with `credentials: 'include'`

### Component Hierarchy
```
Layout (sidebar/nav + user info)
├── Dashboard
│   └── BoardCard[] + CreateBoardModal
├── BoardView
│   ├── Heatmap
│   ├── HabitCard[]
│   ├── CreateHabitModal
│   └── CheckInModal / EntryForm
└── HabitView
    ├── EntryForm
    ├── Heatmap
    ├── StreakBadge
    └── ActivityFeed
```

---

## Development Workflow

### Backend
```bash
cd backend
go run ./cmd/server
# or via Docker:
docker-compose up -d db backend
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://127.0.0.1:5173
```

### Database
- Migrations auto-run on server startup via `db.RunMigrations()`
- Migration files: `backend/migrations/`
- Current: `000001_init` (creates full Phase 1 schema + follows table for Phase 3)

---

## Phase Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| **Phase 1** | AT OAuth, boards, habits (binary/quantitative/timed), entries, heatmaps, streaks, PWA | **In Progress** |
| **Phase 2** | Custom color schemes, habit templates, rest days, composite boards | Planned |
| **Phase 3** | Social: follows, public boards, leaderboards, streak rankings | Planned |
| **Phase 4** | Analytics, data export, dark/light theming, mobile optimizations | Planned |

---

## Important Notes for Agents

- **Auth is AT Protocol OAuth only** — no local passwords. Users sign in with Bluesky handles.
- **JWT secret** must be changed in production (`JWT_SECRET`).
- **Database migrations** run automatically on server start. Do not manually edit migration files that have already run in production.
- **Heatmap color schemes** are stored per-board as JSONB with keys `empty` and `levels[]` (4 levels).
- **Habit types**: `binary` (check/uncheck), `quantitative` (numeric target), `timed` (duration target).
- **Entry uniqueness**: One entry per habit per date (`UNIQUE(habit_id, date)`).
- **Streaks** are materialized in the `streaks` table for performance, not computed on the fly.
- **Frontend uses relative API paths** (`/api/...`) — the Vite dev server proxies to the backend in dev mode.
- **CORS credentials** are enabled — the frontend must be served from the configured `FRONTEND_URL`.
- **Go module path**: `github.com/jaredlemler/life-trackin`
