# LifeTrack Worklog — June 3, 2026

## What We Accomplished Today

### 1. Backend (Go + PostgreSQL)
- **Project structure**: `cmd/server/main.go`, `internal/` packages, `migrations/`
- **Database schema**: Full migrations for users, boards, habits, entries, streaks, follows, oauth tables
- **AT Protocol OAuth flow**: Login, callback, session management using Bluesky Indigo SDK
  - Handle resolution to DID
  - DID-to-PDS discovery  
  - OAuth metadata fetching
  - PKCE + state generation
  - JWT session middleware with HTTP-only cookies
- **CRUD APIs**:
  - Boards (create, list, get, update, delete)
  - Habits (create, list, get, update, delete) with JSONB config
  - Entries (create, list, delete) with streak recalculation
  - Heatmap aggregation endpoint
  - Streak info endpoint
- **Docker setup**: `docker-compose.yml` (PostgreSQL + Go backend), `docker/backend.Dockerfile`

### 2. Frontend (React + Vite + TypeScript + Tailwind v4)
- **Scaffold**: Vite project with React, TypeScript, Tailwind CSS v4, react-router-dom
- **PWA setup**: `vite-plugin-pwa` with service worker, manifest, icons
- **API client**: `lib/api.ts` with fetch wrapper, auth/board/habit/entry endpoints
- **Pages**:
  - `Login.tsx` — AT Protocol handle input, redirects to OAuth
  - `Dashboard.tsx` — Board grid with empty state, create board modal
  - `BoardView.tsx` — Board detail with habits list, heatmap, add habit modal
  - `HabitView.tsx` — Habit detail with stats cards, heatmap, entries list, log entry form
- **Components**:
  - `Layout.tsx` — App shell with header, user badge, logout
  - `Heatmap.tsx` — GitHub-style year grid (compact + full modes)
  - `BoardCard.tsx` — Board preview card with mini heatmap
  - `HabitCard.tsx` — Habit row with type icon
  - `CreateBoardModal.tsx` — Name, description, visibility selector
  - `CreateHabitModal.tsx` — Name, type (binary/quantitative/timed), target, unit
  - `EntryForm.tsx` — Date picker, type-specific inputs, notes
  - `StreakBadge.tsx` — Flame icon + streak count badge
  - `ActivityFeed.tsx` — Placeholder for social feed
- **Hooks**: `useAuth.ts` (fetches `/api/auth/me`), `useApi.ts` (async state wrapper)
- **Types**: Full TypeScript interfaces for User, Board, Habit, Entry, StreakInfo, Heatmap
- **Utils**: Heatmap color levels, date formatting, duration formatting

### 3. Build Status
- **Frontend**: Builds successfully (`npm run build` passes), PWA service worker generated
- **Backend**: Source code compiles in principle but dependency resolution is blocked

---

## Current Blocker

### ~~Primary Issue: Go Dependency Version Conflict~~ ✅ RESOLVED

**Root cause**: The Bluesky Indigo SDK requires Go >= 1.26. Ubuntu apt only provides Go 1.22.

**Resolution**: Installed Go 1.26.4 from official binaries at `/usr/local/go`. Updated `docker/backend.Dockerfile` to use `FROM golang:alpine` (which ships Go 1.26.4). Ran `go get github.com/bluesky-social/indigo@latest` successfully.

### Secondary Issues — All Resolved
- ~~`docker-compose.yml` missing~~ → Created
- ~~Docker build fails~~ → Fixed with updated base image
- ~~`.air.toml` missing~~ → Created (caused container restart loop)
- ~~Migrations~~ → Applied successfully

---

## Current System State

| Component | Status |
|-----------|--------|
| Go 1.26.4 | Installed at `/usr/local/go/bin/go` |
| PostgreSQL 16 | **Running in Docker** (`lifetrack-db`), port 5432, healthy |
| Backend API | **Running in Docker** (`lifetrack-backend`), port 8080 |
| Frontend dev server | **Running locally**, port 5173 |
| Database migrations | Applied successfully |
| Frontend code | Complete, builds clean |
| Frontend dependencies | Installed |
| Backend code | Complete, compiles, containerized |
| Backend dependencies | `go.mod`/`go.sum` resolved |
| PWA config | Vite plugin configured, manifest + SW generated |

---

## Running Services

| Service | URL | Container/Process |
|---------|-----|-----------------|
| Frontend | http://localhost:5173 | Local (`npm run dev`) |
| Backend API | http://localhost:8080 | Docker (`lifetrack-backend`) |
| Database | localhost:5432 | Docker (`lifetrack-db`) |

---

## Next Steps

### Step 1: End-to-End Testing
The full stack is running. Now we need to verify the OAuth login flow works:
- Open http://localhost:5173 in browser
- Enter a Bluesky handle on the login page
- Complete OAuth flow (redirects to PDS, back to callback)
- Verify session cookie is set and `/api/auth/me` returns user data

### Step 2: Functional Testing
- Create a tracking board
- Add habits (binary, quantitative, timed)
- Log daily entries
- Verify heatmap renders with correct color levels
- Verify streak counter increments/decrements correctly

### Step 3: Known Gaps / TODO
- **OAuth client registration**: The app needs to be registered as an OAuth client with Bluesky. For development, we may need to use a local config or mock.
- **Error handling**: Some API error responses are generic; need user-friendly messages in UI
- **Loading states**: Skeleton loaders not implemented yet
- **Empty states**: Dashboard shows placeholder when no boards exist
- **Activity feed**: `ActivityFeed.tsx` is a placeholder (social features in Phase 3)

### Step 4: Phase 2 Features (when ready)
- Custom color schemes per board
- Habit templates (predefined tracking types)
- Frequency rules (X times per week)
- Rest days / skip logic
- Composite boards (aggregate multiple habits)

---

## How to Start / Restart Everything

```bash
# Terminal 1: Database + Backend (Docker)
cd /home/taco/Projects/Life-trackin
docker compose up -d

# Terminal 2: Frontend (local dev server)
cd /home/taco/Projects/Life-trackin/frontend
npm run dev
```

Access:
- **App**: http://localhost:5173
- **API**: http://localhost:8080
- **Database**: localhost:5432
