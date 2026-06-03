# Project Status — LifeTrack

**Last updated**: 2026-06-03

---

## Phase 1: Core Habit Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| AT Protocol OAuth login | Ready | Full PKCE + PAR + DPoP flow via Indigo SDK |
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
| Backend server | Running (Go + Chi) |
| PostgreSQL | Schema migrated (`000001_init`) |
| Frontend dev server | Running (Vite) |
| Docker setup | `docker-compose` available for db + backend |
| Migrations | `golang-migrate` integrated |

---

## Known Issues
- None documented at this time.

## Next Priority
- Continue Phase 1 frontend polish or begin Phase 2 features based on user direction.
