# LifeTrack Repository Review & Infrastructure Plan

*Prepared by Senior DevSecOps Engineer — June 5, 2026*

---

## Executive Summary

The LifeTrack repository represents a **solid architectural foundation** with good separation of concerns, modern tooling choices, and a working local development environment. However, it is currently **not production-ready** from an infrastructure, security, or operational perspective. The gap between "works on my machine" and "deployed, observable, secure service" is significant and must be addressed before any user-facing launch.

---

## 1. Current State Assessment

### What Is Working

| Component | Status | Notes |
|-----------|--------|-------|
| **Backend Architecture** | Strong | Clean `internal/` package layout, Chi router, pgxpool with connection limits |
| **AT Protocol OAuth** | Functional | Indigo SDK patched for public client PAR flow; JWT session management implemented |
| **Database Schema** | Complete | Migrations for users, boards, habits, entries, streaks, follows, OAuth tables |
| **Local Docker Dev** | Functional | `docker compose up` brings up DB + backend with Air hot-reload |
| **Frontend Build** | Functional | Vite + React 19 + Tailwind v4 compiles clean; routing and API abstraction in place |
| **CRUD APIs** | Complete | Boards, habits, entries, public profiles, heatmap aggregation |

### What Is Broken or Missing

| Component | Severity | Notes |
|-----------|----------|-------|
| **PWA Manifest** | High | `manifest.json` is **0 bytes empty** — PWA install is broken |
| **Service Worker** | High | `public/sw.js` is **0 bytes empty** — offline support does not exist |
| **Production Dockerfile** | Critical | Current Dockerfile uses Air (dev tool); no multi-stage production build |
| **CI/CD Pipeline** | Critical | No GitHub Actions, no automated tests, no automated deployment |
| **Cookie Security** | High | Domain hardcoded to `127.0.0.1`, `Secure: false`, `SameSite: Lax` |
| **Secrets Management** | High | `JWT_SECRET` falls back to hardcoded dev string; `.env` not ignored by Docker layers |
| **Rate Limiting** | Medium | No protection against brute force, scraping, or abuse |
| **Input Validation** | Medium | Basic checks only; no sanitization, no max length enforcement, no SQL injection tests |
| **Structured Logging** | Medium | Uses standard `log` package; no correlation IDs, no levels, no JSON output |
| **Health Checks** | Medium | Only a trivial `/health` endpoint; no DB connectivity check, no readiness probe |
| **Testing** | High | **Zero tests** in backend and frontend |
| **Database Operations** | Medium | No backup/restore strategy, no connection retry logic at startup |
| **Reverse Proxy** | Medium | No nginx/Caddy/traefik config for TLS termination, routing, or asset caching |

---

## 2. Infrastructure Deployment Plan

This plan assumes a **cost-conscious but production-grade** deployment using:

- **Frontend**: Cloudflare Pages (free, fast, PWA-friendly)
- **Backend**: Fly.io or Render (managed PostgreSQL + containerized Go)
- **Alternative**: Self-hosted VPS (Hetzner/DigitalOcean) with Docker Compose for cost control

---

### Phase A: Foundation (Do First)

#### A1. CI/CD Pipeline (`.github/workflows/`)

Create a GitHub Actions workflow with three jobs:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: lifetrack
          POSTGRES_PASSWORD: lifetrack_test
          POSTGRES_DB: lifetrack_test
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.26.4'
      - run: cd backend && go mod download
      - run: cd backend && go vet ./...
      - run: cd backend && go test -race -coverprofile=coverage.out ./...
      - run: cd backend && go build ./cmd/server

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - run: cd frontend && npm run lint
```

**Why**: Every project that lacks CI becomes unshippable within weeks. You cannot deploy what you do not automatically verify.

#### A2. Production Dockerfile

Replace the dev-only Dockerfile with a multi-stage build:

```dockerfile
# docker/backend.Dockerfile.prod
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
COPY docker/patch-indigo.sh /tmp/patch-indigo.sh
RUN chmod +x /tmp/patch-indigo.sh && /tmp/patch-indigo.sh
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
COPY backend/migrations ./migrations
EXPOSE 8080
USER nobody
CMD ["./server"]
```

**Key changes**:
- Multi-stage build drops Go toolchain from final image (saves ~700MB)
- Runs as `nobody` (non-root)
- Embeds migrations into image
- Static binary with stripped symbols

#### A3. Fix PWA

Populate `frontend/public/manifest.json` with real content and generate PWA icons (192x192, 512x512). Either use `vite-plugin-pwa`'s generated manifest or write your own — but an empty manifest breaks installability.

---

### Phase B: Deployment Targets

#### Target 1: Cloudflare Pages + Fly.io (Recommended for Speed)

**Frontend (Cloudflare Pages)**
1. Connect GitHub repo to Cloudflare Pages
2. Build command: `cd frontend && npm run build`
3. Build output directory: `frontend/dist`
4. Add `_redirects` file in `frontend/public/`:
   ```
   /api/*  https://api.lifetrack.app/:splat  200
   ```
5. Set custom domain (e.g., `lifetrack.app`)

**Backend (Fly.io)**
1. `fly launch` from repo root
2. Create `fly.toml`:
   ```toml
   app = "lifetrack-api"
   primary_region = "iad"

   [build]
     dockerfile = "docker/backend.Dockerfile.prod"

   [env]
     PORT = "8080"
     APP_ENV = "production"

   [http_service]
     internal_port = 8080
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0

   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 256
   ```
3. Provision PostgreSQL: `fly postgres create` → `fly postgres attach`
4. Set secrets: `fly secrets set JWT_SECRET=<generate with openssl rand -hex 32>`

**Cost**: ~$5-10/month for the DB + compute. Pages is free.

#### Target 2: Self-Hosted VPS (Recommended for Control)

If you prefer owning the stack:

1. **VPS**: Hetzner CX21 (2 vCPU, 4GB RAM) — ~$5.35/month
2. **OS**: Ubuntu 24.04 LTS
3. **Reverse Proxy**: Caddy (automatic HTTPS via Let's Encrypt)
   ```caddyfile
   lifetrack.app {
       reverse_proxy localhost:8080
       encode gzip zstd
   }
   ```
4. **Deployment**: Docker Compose on the VPS with `docker-compose.prod.yml`
5. **Database**: PostgreSQL 16 on the same VPS (sufficient for <10k users)
6. **Backups**: `pg_dump` cron job to S3-compatible storage (Backblaze B2)

---

### Phase C: Security Hardening

#### C1. Environment & Secrets

- **Never** fall back to default `JWT_SECRET` in production. Fatal if empty.
- Use a secrets manager (Fly secrets, 1Password Secrets Automation, or HashiCorp Vault)
- Add `APP_ENV` check: if `production`, enforce `Secure: true`, `SameSite: Strict`, and remove hardcoded `Domain`

#### C2. Cookie Security (Production)

```go
secure := os.Getenv("APP_ENV") == "production"
domain := "" // Let browser infer; only set explicitly if needed

http.SetCookie(w, &http.Cookie{
    Name:     "session_token",
    Value:    tokenStr,
    Path:     "/",
    Domain:   domain,
    HttpOnly: true,
    Secure:   secure,
    SameSite: http.SameSiteStrictMode,
    MaxAge:   7 * 24 * 60 * 60,
})
```

#### C3. Rate Limiting

Add `golang.org/x/time/rate` or use a Chi middleware:

```go
import "github.com/go-chi/httprate"

r.Use(httprate.LimitByIP(100, 1*time.Minute)) // 100 req/min
r.Route("/api/auth", func(r chi.Router) {
    r.Use(httprate.LimitByIP(5, 1*time.Minute)) // stricter on auth
    r.Get("/login", authHandler.Login)
})
```

#### C4. Input Validation

- Add maximum length limits to all text fields (name ≤ 100 chars, description ≤ 500)
- Validate `color_scheme` JSON structure before saving
- Use `pgx` parameterization (already done — good)

#### C5. CORS Lockdown

Current CORS allows any origin matching `FRONTEND_URL`. In production, explicitly set origins:

```go
AllowedOrigins: []string{
    "https://lifetrack.app",
    "https://www.lifetrack.app",
},
```

---

### Phase D: Observability

#### D1. Structured Logging

Replace `log` with `log/slog` (Go 1.26) for JSON output:

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
slog.SetDefault(logger)
logger.Info("server starting", "port", port)
```

#### D2. Health Checks

Expand `/health` to verify DB connectivity:

```go
r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
    if err := pool.Ping(r.Context()); err != nil {
        slog.Error("health check failed", "error", err)
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{"status": "unhealthy", "db": "down"})
        return
    }
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
})
```

#### D3. Metrics

Expose a `/metrics` endpoint using the existing `prometheus/client_golang` dependency:

```go
import "github.com/prometheus/client_golang/prometheus/promhttp"
r.Handle("/metrics", promhttp.Handler())
```

Then scrape with Prometheus or Grafana Cloud (free tier available).

#### D4. Error Tracking

Add Sentry integration (`github.com/getsentry/sentry-go`) for production panic capture and error alerting.

---

### Phase E: Database Operations

#### E1. Connection Resilience

Add retry logic in `main.go` before starting the server:

```go
var pool *pgxpool.Pool
var err error
for i := 0; i < 10; i++ {
    pool, err = db.Connect(ctx, databaseURL)
    if err == nil { break }
    slog.Warn("db connection failed, retrying", "attempt", i+1, "error", err)
    time.Sleep(2 * time.Second)
}
if err != nil {
    log.Fatal("failed to connect to database after retries", "error", err)
}
```

#### E2. Backup Strategy

**For Fly.io**: Use Fly's automated PostgreSQL backups (included).

**For self-hosted**:

```bash
# Daily backup cron
0 3 * * * docker exec lifetrack-db pg_dump -U lifetrack lifetrack | gzip > /backups/lifetrack-$(date +\%Y\%m\%d).sql.gz
```

#### E3. Migration Safety

Never run `migrations.Up()` automatically in production without a maintenance window or canary check. Consider running migrations as a separate job:

```yaml
# In docker-compose.prod.yml
  migrate:
    image: migrate/migrate
    command: ["-path", "/migrations", "-database", "postgres://...", "up"]
    volumes:
      - ./backend/migrations:/migrations
    depends_on:
      db:
        condition: service_healthy
```

---

## 3. Recommended Priority Roadmap

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Write backend unit tests (auth middleware, handlers) | 2 days | Critical — cannot ship without tests |
| **P0** | Create production Dockerfile | 2 hours | Required for any deployment |
| **P0** | Fix PWA manifest & icons | 3 hours | Core feature promise |
| **P1** | Set up GitHub Actions CI | 4 hours | Required for team velocity |
| **P1** | Harden cookies & env validation | 2 hours | Security baseline |
| **P1** | Add rate limiting | 2 hours | Prevents abuse |
| **P2** | Deploy to Fly.io + Cloudflare Pages | 1 day | Get to production |
| **P2** | Add structured logging & health checks | 4 hours | Operational visibility |
| **P3** | Add Prometheus metrics | 4 hours | Performance monitoring |
| **P3** | Set up DB backups | 2 hours | Data safety |

---

## 4. Immediate Action Items (This Week)

1. **Write 5 critical backend tests**:
   - JWT middleware validates/invalidates tokens
   - Board CRUD enforces ownership
   - Entry creation triggers streak update
   - OAuth callback rejects invalid state
   - Public API hides private boards

2. **Build the production Dockerfile** and verify it locally:
   ```bash
   docker build -f docker/backend.Dockerfile.prod -t lifetrack-prod .
   docker run -p 8080:8080 --env-file backend/.env lifetrack-prod
   ```

3. **Fix the PWA manifest** so the app is installable.

4. **Add the CI workflow** so every PR is validated.

5. **Change the fallback JWT secret behavior**: if `JWT_SECRET` is empty in production, `log.Fatal`. Do not default.

---

## 5. Final Assessment

LifeTrack has **excellent code quality and architecture for its stage**, but it is currently a **development project**, not a deployed service. The distance to production is not months — it is **one focused week** of DevSecOps work. The backend team chose good libraries, the frontend team built a clean API abstraction, and the AT Protocol integration is non-trivial but functional.

**The highest-risk items right now are:**

1. **Zero tests** — a single bad refactor will break OAuth or data ownership checks
2. **No production build artifact** — you cannot deploy what you have
3. **Security defaults** — the cookie and CORS config will fail a basic security review

Fix these three, and you have a shippable product. Everything else (metrics, backups, Sentry) is **important but not blocking**.

---

*Document generated by Senior DevSecOps Engineer, LifeTrack project.*
