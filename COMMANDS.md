# LifeTrack — Command Reference

Quick reference for common development tasks.

---

## Start Everything

```bash
cd /home/taco/Projects/Life-trackin

# Start DB + backend (Docker)
docker compose up -d --build

# Start frontend (local dev server)
cd frontend && npm run dev
```

Access:
- **Frontend**: http://127.0.0.1:5173
- **Backend API**: http://127.0.0.1:8080
- **Client metadata**: http://127.0.0.1:8080/client-metadata.json

---

## Docker

```bash
# Start all services
docker compose up -d

# Start with rebuild (after Dockerfile/go.mod changes)
docker compose up -d --build

# Stop everything
docker compose down

# Stop and remove volumes (wipes DB data)
docker compose down -v

# View logs
docker compose logs

# View backend logs (follow)
docker compose logs -f backend

# View DB logs
docker compose logs db

# Restart just the backend
docker compose restart backend

# Check container status
docker ps
```

---

## Backend (Local Go — uses host's patched module cache)

```bash
cd /home/taco/Projects/Life-trackin/backend

# Build
/usr/local/go/bin/go build ./cmd/server

# Run (requires DB running in Docker)
/usr/local/go/bin/go run ./cmd/server

# Run with explicit env
DATABASE_URL=postgres://lifetrack:lifetrack_dev@localhost:5432/lifetrack?sslmode=disable \
APP_URL=http://127.0.0.1:8080 \
FRONTEND_URL=http://127.0.0.1:5173 \
JWT_SECRET=dev-secret-change-in-production \
/usr/local/go/bin/go run ./cmd/server
```

> Use `/usr/local/go/bin/go` — system `go` is 1.22.2 (too old for Indigo SDK).

---

## Frontend

```bash
cd /home/taco/Projects/Life-trackin/frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Database

```bash
# Connect via docker exec
docker exec -it lifetrack-db psql -U lifetrack -d lifetrack

# Connect via psql (if installed locally)
psql "postgres://lifetrack:lifetrack_dev@localhost:5432/lifetrack?sslmode=disable"

# Common psql commands
\dt              # list tables
\d users         # describe table
\q               # quit

# Run migrations manually (if golang-migrate is installed)
migrate -path backend/migrations -database "postgres://lifetrack:lifetrack_dev@localhost:5432/lifetrack?sslmode=disable" up
```

### Useful Queries

```sql
-- List users
SELECT id, did, handle, created_at FROM users;

-- List OAuth sessions
SELECT session_id, did, created_at FROM oauth_sessions;

-- List boards with user
SELECT b.id, b.name, u.handle FROM boards b JOIN users u ON b.user_id = u.id;

-- List habits in a board
SELECT name, type, target_value, unit FROM habits WHERE board_id = '...';
```

---

## OAuth / Auth Testing

```bash
# Check client metadata
curl -s http://127.0.0.1:8080/client-metadata.json | jq

# Check auth status (should 401 when logged out)
curl -s http://127.0.0.1:8080/api/auth/me

# Test login initiation (returns redirect URL)
curl -s "http://127.0.0.1:8080/api/auth/login?handle=jaredlemler.com" -v
```

---

## Logs & Debugging

```bash
# Backend logs
docker compose logs backend --tail 50

# Follow backend logs in real-time
docker compose logs -f backend

# Search for OAuth errors
docker compose logs backend | grep -i "oauth\|auth\|error"
```

---

## Rebuild After Code Changes

```bash
# Backend only (Docker auto-reloads via Air, but rebuild if needed)
docker compose up -d --build backend

# Full rebuild (DB + backend)
docker compose down
docker compose up -d --build
```

---

## One-Liners

```bash
# Quick health check
curl -s http://127.0.0.1:8080/client-metadata.json | jq '.client_id'

# Wipe DB and start fresh
docker compose down -v && docker compose up -d --build

# Build backend binary locally
/usr/local/go/bin/go build -o /tmp/lifetrack-server ./backend/cmd/server
```

---

## Notes

- `APP_URL` and `FRONTEND_URL` must use `127.0.0.1`, not `localhost` (Bluesky OAuth RFC 8252 requirement).
- The Indigo SDK is patched at build time via `docker/patch-indigo.sh`. If the SDK updates and breaks the patch, check that script.
- System `go` is 1.22.2 (too old). Go 1.26.4 is at `/usr/local/go/bin/go`.


docker compose exec db psql -U lifetrack -d lifetrack