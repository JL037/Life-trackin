# LifeTrack

A GitHub-style life tracking PWA built on the AT Protocol. Track habits, goals, and daily routines with beautiful heatmap visualizations.

## Architecture

- **Backend**: Go + Chi router + PostgreSQL + AT Protocol OAuth (via Bluesky Indigo SDK)
- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4 + PWA
- **Auth**: AT Protocol DID-based OAuth (identity only, data stored locally)

## Features (Phase 1)

- AT Protocol OAuth login with your Bluesky handle
- Create customizable tracking boards
- Add habits (binary, quantitative, timed)
- GitHub-style heatmap visualizations per board
- Daily entry logging with streak tracking
- PWA with offline support

## Quick Start

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ (for frontend dev)

### Run Everything

```bash
cd /home/taco/Projects/Life-trackin

# Start PostgreSQL and backend
docker-compose up -d db

# Backend (in Docker with hot-reload)
docker-compose up -d backend

# Frontend (local dev)
cd frontend
npm install
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

### Environment Variables

Create `backend/.env`:
```
DATABASE_URL=postgres://lifetrack:lifetrack_dev@localhost:5432/lifetrack?sslmode=disable
PORT=8080
APP_URL=http://localhost:8080
FRONTEND_URL=http://localhost:5173
JWT_SECRET=dev-secret-change-in-production
```

## AT Protocol OAuth

This app uses the official Bluesky Indigo SDK (`github.com/bluesky-social/indigo`) for AT Protocol OAuth:
- Handle resolution to DID
- PDS discovery
- PKCE + PAR OAuth flow
- DPoP token handling

Users sign in with their Bluesky handle. No passwords stored locally.

## Data Model

| Entity | Description |
|--------|-------------|
| `users` | AT Protocol DID + handle |
| `boards` | Tracking boards with visibility |
| `habits` | Individual trackables (binary/quantitative/timed) |
| `entries` | Daily log entries |
| `streaks` | Computed streak data |

## API Endpoints

### Auth
- `GET /api/auth/login?handle=` - Initiate AT Protocol OAuth
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/me` - Current user
- `POST /api/auth/logout` - Logout

### Boards
- `GET/POST /api/boards` - List/Create boards
- `GET/PUT/DELETE /api/boards/:id` - Board CRUD
- `GET /api/boards/:id/heatmap` - Heatmap data

### Habits
- `GET/POST /api/boards/:id/habits` - List/Create habits
- `GET/PUT/DELETE /api/habits/:id` - Habit CRUD

### Entries
- `POST /api/habits/:id/entries` - Log entry
- `GET /api/habits/:id/entries` - List entries
- `GET /api/habits/:id/streak` - Streak info

## Future Phases

- **Phase 2**: Custom color schemes, habit templates, rest days, composite boards
- **Phase 3**: Social features (follow, public boards, leaderboards, streak rankings)
- **Phase 4**: Analytics, data export, dark/light theming, mobile optimizations

## License

MIT
