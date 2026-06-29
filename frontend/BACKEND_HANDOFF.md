# Frontend <> Backend Handoff

> Created: 2026-06-06  
> Purpose: Document frontend changes that require backend support, new endpoints, or schema updates.

---

## How to Use This File

- **BLOCKING**: Frontend cannot ship this feature without backend work first.
- **READY**: Backend already supports this; frontend is unblocked.
- **FUTURE**: Not needed immediately, but planned for upcoming phases.

---

## Phase 1: Foundation (Current Sprint) -- COMPLETE

Phase 1 is done. Below are the remaining backend items for reference.

### 1. Entry Editing -- BLOCKING (Remaining Backend Work)

**Frontend Need:** Users must be able to edit an existing entry's date, value (bool/numeric/duration), and notes.

**Current Backend Gap:**
- `EntryHandler` has `Create`, `List`, `Streak`, `Delete` -- **no `Update` method exists.**
- `main.go` has no route for `PUT /entries/{entryID}`.

**Required Backend Work:**
1. Add `UpdateEntryRequest` struct in `internal/handlers/entries.go`.
2. Implement `EntryHandler.Update` with ownership verification + streak recalculation.
3. Add route: `r.Put("/entries/{entryID}", entryHandler.Update)`.

**Frontend Status:** ✅ `api.entries.update()` added. `EditEntryModal.tsx` is ready and calls it.

**Priority:** HIGH

---

### 2. Habit Editing -- READY ✅
- `PUT /habits/{habitID}` supported. `EditHabitModal.tsx` implemented.

### 3. Board Editing -- READY ✅
- `PUT /boards/{boardID}` supported. `EditBoardModal.tsx` implemented.

---

## Phase 2: Daily Driver (Next 2 Months)

### 4. Data Export -- BLOCKING

**Frontend Need:** Users can export all their data (boards, habits, entries) as JSON or CSV from Profile settings.

**Current Backend Gap:** No endpoint returns a user's complete dataset.

**Required Backend Work:**
1. New endpoint `GET /export` (or `GET /auth/export`) that:
   - Returns the authenticated user's full data graph:
     - User profile
     - All boards
     - All habits per board
     - All entries per habit
     - Streak info per habit
   - Response format option via query param: `?format=json` (default) or `?format=csv`
   - CSV format should flatten the nested structure into rows:
     `board_name, habit_name, date, value_bool, value_numeric, value_duration, notes`
2. For JSON, structure:
   ```json
   {
     "user": { ... },
     "boards": [
       {
         "board": { ... },
         "habits": [
           {
             "habit": { ... },
             "entries": [ ... ],
             "streak": { ... }
           }
         ]
       }
     ],
     "exported_at": "2026-06-06T..."
   }
   ```
3. Consider streaming/large payload handling if users have years of data.

**Priority:** MEDIUM -- Needed for data portability and user trust.

---

### 5. Public Board Heatmap -- BLOCKING

**Frontend Need:** Public profiles show board preview cards. If we later link to public board views, we need the heatmap data without auth.

**Current Backend Gap:**
- `/api/public/boards/{boardID}/stats` exists
- `/api/boards/{boardID}/heatmap` requires auth middleware
- No public heatmap endpoint

**Required Backend Work:**
1. Add `r.Get("/boards/{boardID}/heatmap", publicHandler.BoardHeatmap)` under the public router.
2. Implement `BoardHeatmap` handler that:
   - Verifies board visibility is `public`
   - Returns the same heatmap response shape as the authenticated endpoint
   - Does NOT expose habit names in `completed_habits` if board is `followers` (or filter appropriately)

**Priority:** MEDIUM -- Only needed when we add public board detail pages.

---

### 6. Habit-Level Heatmap -- BLOCKING

**Frontend Need:** `HabitView` shows a heatmap for a single habit's entries over time (not the board aggregate).

**Current Backend Gap:**
- `/api/boards/{boardID}/heatmap` exists (board-level aggregation)
- No `/api/habits/{habitID}/heatmap` endpoint

**Required Backend Work:**
1. Add `func (h *HabitHandler) Heatmap(w http.ResponseWriter, r *http.Request)` in `habits.go`
2. Query entries for the habit, group by date, calculate value levels:
   - Binary: `level = 0` (missed) or `4` (done)
   - Quantitative: `level = getHeatmapLevel(value_numeric / target_value)`
   - Timed: similar ratio-based leveling
3. Return same `HeatmapResponse` shape as board heatmap
4. Add route: `r.Get("/habits/{habitID}/heatmap", habitHandler.Heatmap)`
5. Update `Heatmap.tsx` to call `api.habits.heatmap(habitId, year)` when `habitId` prop is passed

**Priority:** LOW -- Current workaround shows board heatmap on habit view. Nice-to-have.

---

## Phase 3: Growth & Advanced Features (Future)

### 7. Offline Sync / Idempotency -- FUTURE

**Frontend Need:** PWA stores offline entry creations in IndexedDB, then syncs when online.

**Backend Considerations:**
- Entries created offline may be retried on reconnect. Without idempotency keys, duplicate entries can be created.
- **Recommendation:** Add optional `client_id` or `idempotency_key` field to `CreateEntryRequest`. The backend should reject (or return existing) if a duplicate key is detected within a 24-hour window.
- Alternatively, accept a `client_generated_id` UUID from the frontend and use `INSERT ... ON CONFLICT (client_generated_id) DO NOTHING`.

**Priority:** LOW -- Only needed when implementing offline-first sync queue.

---

### 8. Public Board Embed Widget -- FUTURE

**Frontend Need:** Users can embed a read-only heatmap widget on their personal blog.

**Backend Considerations:**
- Need CORS headers on public endpoints so iframe embeds work cross-origin
- Consider rate limiting on public heatmap endpoints to prevent abuse
- Consider caching public heatmap data (Redis or in-memory) since it changes slowly

**Priority:** LOW -- Exploration phase.

---

### 9. Batch / Bulk Operations -- FUTURE

**Frontend Need:** Bulk delete entries, bulk log entries for a date.

**Backend Considerations:**
- `DELETE /entries/bulk` with body `{ entry_ids: ["...", "..."] }`
- `POST /habits/{habitID}/entries/bulk` for importing historical data
- Transaction wrapping to ensure atomicity

**Priority:** LOW -- Not on near-term roadmap.

---

### 10. Webhooks / Integrations -- FUTURE

**Frontend Need:** Zapier/Make integration triggered on habit completion.

**Backend Considerations:**
- New `webhooks` table: `user_id, url, events[], secret, created_at`
- Fire webhook asynchronously (background worker or goroutine) when entry is created with `value_bool=true`
- Retry logic with exponential backoff
- Event types: `habit.completed`, `streak.milestone`, `board.heatmap_update`

**Priority:** VERY LOW -- Post-Phase 3 exploration.

---

## Schema Considerations

### Color Scheme Storage
The `boards.color_scheme` column is already `jsonb`. Frontend now sends 5 preset color schemes. The backend stores them as-is. No schema change needed.

### Potential Additions
- `entries.client_id` (UUID): For offline sync idempotency
- `webhooks` table: For integrations
- `user_settings` table: For frontend preferences (theme, sound, reduced motion)

---

## API Surface Quick Reference

### Already Supported (Frontend Unblocked)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/auth/me` | GET, PUT | ✅ |
| `/api/boards` | GET, POST | ✅ |
| `/api/boards/{id}` | GET, PUT, DELETE | ✅ |
| `/api/boards/{id}/stats` | GET | ✅ |
| `/api/boards/{id}/heatmap` | GET | ✅ |
| `/api/boards/{id}/habits` | GET, POST | ✅ |
| `/api/habits/{id}` | GET, PUT, DELETE | ✅ |
| `/api/habits/{id}/streak` | GET | ✅ |
| `/api/habits/{id}/entries` | GET, POST | ✅ |
| `/api/entries/{id}` | DELETE | ✅ |
| `/api/public/users/{handle}` | GET | ✅ |
| `/api/public/users/{handle}/boards` | GET | ✅ |
| `/api/public/boards/{id}/stats` | GET | ✅ |
| `/api/follows/{handle}` | POST, DELETE | Social follow/unfollow | ✅ **Frontend ready** |
| `/api/follows?type=following` | GET | List following | ✅ **Frontend ready** |
| `/api/follows?type=followers` | GET | List followers | ✅ **Frontend ready** |
| `/api/feed?limit=50` | GET | Activity feed | ✅ **Frontend ready** |

### Missing / Needed
| Endpoint | Method | Needed For | Priority |
|----------|--------|------------|----------|
| `/api/entries/{id}` | PUT | Entry editing | **HIGH** |
| `/api/habits/{id}/heatmap` | GET | Habit-level heatmap | LOW |
| `/api/export` | GET | Data export | MEDIUM |
| `/api/public/boards/{id}/heatmap` | GET | Public board heatmap | MEDIUM |
| `/api/entries` | DELETE (bulk) | Bulk entry delete | LOW |

> **Social endpoints** (`/api/follows/*`, `/api/feed`) are implemented on the frontend side. The backend team delivered these in `frontend-handoff.md` and the frontend has consumed them: `PublicProfile` has follow/unfollow buttons, `/following` page lists following/followers, `/feed` page shows activity feed.

---

## Action Items for Backend Team

1. **This sprint (Phase 1 Remaining):**
   - [ ] Implement `EntryHandler.Update` + route `PUT /entries/{entryID}`
   - [x] Add `api.entries.update()` to frontend `lib/api.ts` — **DONE**
   - [x] Social endpoints consumed by frontend (`/api/follows/*`, `/api/feed`) — **DONE**
   - [x] Validation error shape (`{"error":"validation failed","fields":{}}`) consumed by frontend — **DONE**
   - [x] Rate limit 429 handling consumed by frontend — **DONE**

2. **Next sprint (Phase 2):**
   - [ ] Implement `GET /export` (JSON + CSV)
   - [ ] Implement `GET /api/public/boards/{id}/heatmap`

3. **Backlog (Phase 3+):**
   - [ ] `GET /api/habits/{id}/heatmap`
   - [ ] `entries.client_id` for idempotency
   - [ ] Webhooks table + async firing

---

*This file should be updated whenever a frontend feature requires a new endpoint, schema change, or backend behavior modification.*
