# LifeTrack Frontend Status & Roadmap

> Last updated: 2026-06-06  
> Stack: React 19 + Vite 8 + TypeScript + Tailwind CSS v4 + PWA  
> Phase 1 Progress: **10/10 COMPLETE** | Phase 1.5 (Backend Handoff): **9/9 COMPLETE** | Phase 2 Ready

---

## 1. Executive Summary

The LifeTrack frontend has a **strong, cohesive visual identity** built around a retro terminal / CRT monitor aesthetic. The core CRUD flows (boards, habits, entries) are functional, AT Protocol OAuth is wired up, and the PWA scaffold exists. However, the app is currently at an **MVP-minus state** -- it handles the happy path well but lacks the polish, error resilience, and standard features users expect from a modern productivity app. The biggest risk is not technical debt, but **user retention friction**: no onboarding, no offline support, no quick actions, no visual delight beyond the base theme, and several no-op UI elements that create dead ends.

**Theme Strength: A**  
**Feature Completeness: B+**  
**Error Resilience: B+**  
**Accessibility: B+**  
**Mobile Experience: B+**

---

## 2. What's Working Well

- **Visual Identity**: The terminal aesthetic is consistently applied across most components. CRT scanlines, phosphor-green palette, monospace typography, and bracket-label headers create a memorable brand.
- **Authentication Flow**: AT Protocol OAuth login is clean and thematic. The boot-sequence login screen sets tone immediately.
- **Data Architecture**: Simple, flat API layer (`lib/api.ts`) with typed responses. `useAuth` and `useApi` hooks are well-structured.
- **Modal System**: All modals now follow the terminal theme, have Escape-to-close, and display user-visible errors.
- **Heatmap Visualization**: GitHub-style contribution grid adapted well to the terminal palette. Board-level aggregation works.
- **Mobile Safety**: Delete buttons are now visible on touch devices. Viewport allows zooming.

---

## 3. Critical Gaps -- Standard App Features Missing

These are features that users **expect** to exist in any modern habit tracker. Their absence makes the app feel unfinished.

### 3.1 No-Op UI Elements (Dead Ends)
| Location | Element | Problem | Status |
|----------|---------|---------|--------|
| `BoardView.tsx:66` | Settings button | ~~Does nothing.~~ Now opens `EditBoardModal` with name, description, visibility, and color scheme editing. | **FIXED** |
| `HabitView.tsx` | ~~No edit button~~ | ✅ Habits can now be edited via `EditHabitModal` (name, description, target, unit). Pencil icon in header. | **FIXED** |
| `HabitView.tsx` | ~~Entry edit~~ | ✅ Entries can now be edited via `EditEntryModal` (date, value, notes). Pencil icon next to each entry. | **FIXED** |
| `Profile.tsx` | Save button | No visual error state if save fails beyond console.error. | **PENDING** |

### 3.2 Navigation & Wayfinding
- **~~No 404 page~~**: ✅ Thematic `NotFound` page with ASCII art, error log, and return link. Catches all unknown routes.
- **No breadcrumbs**: Deep linking into `/habit/:id` gives only a `<< BOARD` back link. A terminal path like `/lifetrack/board/fitness/habit/run` would reinforce the theme.
- **~~Document title never changes~~**: ✅ `useDocumentTitle` hook sets dynamic titles per route: `[BOARDS] // LIFETRACK`, `[Fitness] // LIFETRACK`, `[@handle] // LIFETRACK`, etc.
- **No command palette / search**: With many boards and habits, users need `/` or `Cmd+K` to jump quickly.

### 3.3 Loading & Empty States
- **Boring loaders**: Every page shows `> loading...` with a pulse. For a terminal theme, we could do ASCII progress bars, blinking cursors, or "decoding datastream..." typing effects.
- **Empty states are plain**: `[NO DATA]` with a button. Could be ASCII art boxes, blinking cursors, or randomized "system messages" like `awaiting_input...`.

### 3.4 Data Management
- **No pagination**: `HabitView` shows `entries.slice(0, 20)`. What happens at 1000 entries? Infinite scroll or pagination needed.
- **No entry date filtering**: Users can't view "this week", "this month", or a custom range.
- **No bulk actions**: Delete entries one by one. No "clear all for this week" or bulk select.
- **No undo**: Accidental delete is permanent. A toast/notification with "UNDO" is standard.
- **No data export**: Users can't export their data (JSON, CSV). Critical for a tracking app.
- **No offline handling**: PWA service worker exists, but no offline UI state. If the API is unreachable, users see infinite spinners.

### 3.5 Mobile Experience
- **No bottom navigation bar**: On mobile, the header is the only nav. A bottom bar with Dashboard / Today / Profile icons is standard for PWAs.
- **No pull-to-refresh**: Native-feeling PWAs use pull-to-refresh on lists.
- **~~Input zoom on iOS~~**: ✅ All inputs use `text-base` (16px). `user-scalable=no` removed. No iOS zoom jank.
- **~~Touch targets~~**: ✅ All interactive elements audited and fixed to `min-h-[44px] min-w-[44px]`. Fixed: BoardCard delete, HabitCard delete/arrow, HabitView entry edit/delete, Layout header buttons, BoardView buttons, Profile visibility buttons.

### 3.6 Notification & Feedback
- **~~No toast system~~**: ✅ Global `ToastProvider` + `ToastContainer` implemented. Themed toast stack with 4 types: `[success]` (green), `[error]` (red), `[warning]` (amber), `[info]` (primary). Auto-dismiss with manual close. Positioned bottom-right.
- **No network status indicator**: Users don't know if they're offline.
- **No retry logic**: API failures show errors but no retry button on pages (only in modals).

---

## 4. Theme & UX Deep Dive

### 4.1 Visual Polish Opportunities

| Area | Current | Opportunity |
|------|---------|-------------|
| **Headers** | Share Tech Mono everywhere | Use **VT323** for page titles (`[BOARDS]`, `[HABITS]`) -- it's loaded but unused. VT323 at 24px+ with uppercase + letter-spacing looks incredible. |
| **Scrollbars** | Green thumb on dark track | Add `box-shadow: inset 0 0 2px #33ff33` for a glowing terminal scrollbar. |
| **Selection** | Green bg, white text | Good. Could add a "selection beep" sound effect (optional). |
| **Focus rings** | 1px solid green | Good. Add a subtle glow pulse on focus for interactive elements. |
| **Footer** | Static text | Make it a **live status bar**: `[LIFETRACK v1.0] // AT PROTOCOL // PDS: CONNECTED // SYNCED: 14:32:07` -- updates every minute. Add SW status: `// SW: ACTIVE`. |
| **Activity dots** | `w-2 h-2` squares | Make them blink or pulse at different rates. A solid square is less "alive" than a soft pulse. |

### 4.2 Animation & Motion
- **Route transitions**: Pages snap in instantly. Add a CRT-warm-up effect:
  ```css
  @keyframes crt-on {
    0% { opacity: 0; filter: brightness(3); }
    10% { opacity: 1; filter: brightness(1); }
    20% { opacity: 0.8; }
    30% { opacity: 1; }
    100% { filter: brightness(1); }
  }
  ```
- **Streak badge**: Static flame icon. Make it flicker faster for longer streaks:
  - `< 3 days`: static dim
  - `3-7 days`: slow pulse
  - `7+ days`: fast flicker with occasional "spark" animation
- **Modal open**: Snap-in. Could use a slight scale-up + brightness flash (CRT turning on).
- **Button hover**: Current is border color change. Could add a subtle `text-shadow` glow intensification.

### 4.3 Sound Design (Optional, Thematic)
A `useTerminalSound()` hook playing subtle Web Audio API blips:
- Hover on buttons: very quiet high-pass filtered tick
- Success: pleasant 8-bit "confirm" chirp
- Error: low buzz
- Toggle: soft click
Only enable if `prefers-reduced-motion: no-preference` and user setting is ON.

### 4.4 Per-Board Color Schemes
The `Board` type already has `color_scheme: { empty: string, levels: string[] }`. The UI never uses it. Allow boards to override the global green palette:
- **Phosphor Green** (current): `#33ff33` family
- **Amber**: `#ffb000` family (classic monochrome)
- **Ice Blue**: `#00ffff` family (cyberpunk)
- **Paper White**: `#eeeeee` on `#111111` (e-ink style)
- **Ruby Red**: `#ff3333` family (aggressive/danger theme)

This would make the dashboard visually richer and let users personalize their boards.

### 4.5 Terminal Breadcrumbs
Replace `<< DASHBOARD` with a path-style breadcrumb:
```
/lifetrack > dashboard > fitness > run
```
Monospace, dimmed segments, current segment in bright primary.

---

## 5. Creative Future Features

These go beyond "standard app" into "delightful differentiator" territory.

### 5.1 Daily Command Center (`/today`)
A dedicated "Today" page showing ALL habits across ALL boards that need attention today:
- Binary habits: `[ ]` / `[x]` checkbox grid
- Quantitative: input field with target comparison
- Timed: start/stop timer button
- One-click check-in for everything
- This is the single most useful page for daily usage.

### 5.2 Habit Templates
When creating a habit, offer presets:
- `[Morning Routine]` (binary): Wake up, Meditate, Read
- `[Fitness]` (mixed): Run (timed), Push-ups (quantitative), Stretch (binary)
- `[Creative Work]` (timed): Deep work, Writing, Design
- `[Health]` (quantitative): Water (glasses), Sleep (hours), Steps (count)

### 5.3 ASCII Art Empty States
Instead of `[NO DATA]`, render:
```
+------------------+
|  NO DATA FOUND   |
|                  |
|  [INIT_BOARD]    |
+------------------+
```
Or a blinking cursor: `>_` waiting for input.

### 5.4 Weekly Digest / Summary Cards
A `/stats` page with:
- Week-over-week comparison
- Best day of the week
- Completion rate percentage with ASCII progress bar:
  ```
  [████████████████░░░░] 80%
  ```
- Longest streak celebration animation

### 5.5 Social Layer (AT Protocol Native)
Since we're on AT Protocol:
- Follow other LifeTrack users
- See friends' public board activity in a feed
- "Cheer" on friend's streaks
- Public leaderboard for public boards (who has the longest reading streak?)
- Cross-post achievements to Bluesky

### 5.6 Offline-First Sync Queue
PWA with real offline support:
- Entries created offline are queued in IndexedDB
- Sync indicator in footer: `// QUEUE: 3 ops pending`
- Auto-sync when connection returns
- Conflict resolution for same-day entries

### 5.7 Keyboard Shortcuts
A `useKeyboardShortcuts` hook:
- `/` or `Cmd+K`: Command palette / search
- `n`: New board (on dashboard) / New habit (on board view)
- `e`: Log entry (on habit view)
- `?`: Show shortcut help overlay
- `Esc`: Close modal (already implemented)
- `j/k`: Navigate lists

### 5.8 Gamification Layer
- **Achievements**: "7-Day Streak", "First Board", "100 Entries", "Night Owl" (late entries)
- **Badges**: Displayed on profile, shareable
- **Levels**: User "level" increases with total entries
- **Combo multiplier**: Completing all habits in a board for a day gives bonus points

### 5.9 Advanced Analytics
- **Correlation heatmap**: "When I exercise, I also meditate 80% of the time"
- **Best time of day**: Entry timestamps analyzed for optimal habit timing
- **Seasonal trends**: Line graphs showing habit consistency over months
- **Habit score**: Weighted score based on streak + consistency + difficulty

### 5.10 Integration Ecosystem
- **Webhooks**: Trigger Zapier/Make when a habit is completed
- **API tokens**: Power users can read/write via API
- **iCal export**: Habits as calendar events
- **Apple Health / Google Fit sync**: For fitness habits
- **GitHub integration**: Show coding habits alongside commit graph

---

## 6. Prioritized Roadmap

### Phase 1: Foundation (In Progress) -- Fix the Friction
**Goal: Remove every dead end and make the app feel complete.**

- [x] **Board Edit Modal**: ✅ Implemented `EditBoardModal` with name, description, visibility, and 5 color scheme presets (Phosphor Green, Amber, Ice Blue, Paper White, Ruby Red). Settings button on `BoardView` is now wired up. Updates persist via `api.boards.update`.
- [x] **404 Page**: ✅ Thematic `NotFound` page with ASCII "SECTOR NOT FOUND" art, error log, and `RETURN_TO_DASHBOARD` link. Registered as catch-all `*` route.
- [x] **Toast System**: ✅ Global `ToastProvider` + `ToastContainer` with themed toasts. Types: success/error/warning/info. Used by `EditBoardModal` for save feedback.
- [x] **Habit Edit Modal**: ✅ Implemented `EditHabitModal` with name, description, target_value, and unit editing. Type is shown as read-only (cannot be changed after creation). Edit button (pencil icon) added to `HabitView` header. Calls `api.habits.update`.
- [x] **Entry Edit**: ✅ Implemented `EditEntryModal` with date, value (bool/numeric/duration), and notes editing. Edit button (pencil icon) added next to each entry in `HabitView`. Calls `api.entries.update` (backend endpoint documented in `BACKEND_HANDOFF.md` as needed).
- [x] **Document Titles**: ✅ `useDocumentTitle` hook created. Applied to all pages: `[BOARDS] // LIFETRACK`, `[Fitness] // LIFETRACK`, `[Run] // LIFETRACK`, `[@handle] // LIFETRACK`, `[PROFILE] // LIFETRACK`, `[AUTHENTICATION] // LIFETRACK`, `[404: SECTOR NOT FOUND] // LIFETRACK`.
- [x] **Loading Skeletons**: ✅ `TerminalSkeleton` component suite created: `BoardSkeleton`, `HabitSkeleton`, `StatsSkeleton`, `HeatmapSkeleton`, `EntrySkeleton`. All pages now show themed skeleton blocks instead of `> loading...` text.
- [x] **Network Status Bar**: ✅ `useNetworkStatus` hook added. Footer now shows `ONLINE` (green wifi) / `OFFLINE` (red wifi-off) status with live detection.
- [x] **Input Font Size Fix**: ✅ All `<input>` and `<textarea>` elements audited and confirmed `text-base` (16px) to prevent iOS zoom.
- [x] **Touch Target Audit**: ✅ All interactive buttons, icons, and links now use `min-h-[44px] min-w-[44px]` where they were previously smaller. Fixed: BoardCard delete, HabitCard delete/arrow, HabitView entry edit/delete, Layout header buttons, BoardView buttons, Profile visibility buttons.

> **Progress: 10/10 complete. Phase 1: FOUNDATION is DONE.**

### Phase 1.5: Backend Handoff Implementation (Done)
**Goal: Implement all features from the backend team's `frontend-handoff.md`.**

- [x] **Social API Types**: ✅ Added `FollowsUser`, `FollowsResponse`, `FeedItem`, `FeedResponse`, `ValidationError`, and `ApiError` classes to the type system.
- [x] **Social API Endpoints**: ✅ `api.follows.follow()`, `api.follows.unfollow()`, `api.follows.list()`, `api.feed.list()` added to `lib/api.ts`.
- [x] **Validation Error Handling**: ✅ `ApiError` class captures `validationFields`. `CreateBoardModal` and `CreateHabitModal` now parse `{"error":"validation failed","fields":{...}}` and display field-level errors (red borders + per-field messages).
- [x] **Rate Limit Handling**: ✅ `ApiError` with `status === 429` throws `rate limit exceeded`. Global toast warning shown on all write operations. Client-side debouncing implied.
- [x] **Follow/Unfollow Buttons**: ✅ Added to `PublicProfile` page. Shows `FOLLOW` / `UNFOLLOW` with `UserPlus`/`UserMinus` icons. Checks current follow status on load.
- [x] **Following/Followers Page (`/following`)**: ✅ `Following.tsx` with tab toggle between "Following" and "Followers". Links to user profiles.
- [x] **Activity Feed Page (`/feed`)**: ✅ `Feed.tsx` showing entries from followed users. Themed cards with habit/board info, value display, and notes.
- [x] **Layout Navigation**: ✅ Added FEED and SOCIAL nav links in header with active state styling.
- [x] **App Routes**: ✅ `/following` and `/feed` routes registered in `App.tsx`.

### Phase 2: Daily Driver (Next 2 Months) -- Make It Habitual
**Goal: Users open the app every day because it's faster than not tracking.**

- [ ] **Today Page (`/today`)**: One-page dashboard of all habits needing attention. Quick-check toggles.
- [ ] **Command Palette (`Cmd+K`)**: Search and jump to any board/habit/page.
- [ ] **Undo Toast**: After delete, show "UNDO [3s]" countdown.
- [ ] **Entry Pagination / Infinite Scroll**: Handle large entry histories gracefully.
- [ ] **Date Range Filtering**: View "this week", "last 30 days", custom range on HabitView.
- [ ] **Habit Templates**: Preset configurations during habit creation.
- [ ] **Footer Status Bar**: Live clock, sync status, SW state, PDS connection status.
- [ ] **Mobile Bottom Navigation**: Dashboard / Today / Profile tabs.
- [ ] **Pull-to-Refresh**: On board/habit lists.
- [ ] **Data Export**: JSON/CSV export in Profile settings.

### Phase 3: Growth & Delight (6+ Months) -- Stand Out
**Goal: LifeTrack becomes the habit tracker people recommend because of its personality.**

- [ ] **Animated Streak Badge**: Flicker intensity based on streak length.
- [ ] **CRT Route Transitions**: Warm-up animation on page change.
- [ ] **ASCII Empty States**: Creative, themed emptiness.
- [ ] **Weekly Digest Email / Page**: Stats summary with ASCII art.
- [ ] **Gamification**: Achievements, badges, levels.
- [ ] **Offline-First Sync**: IndexedDB queue, auto-sync, conflict resolution.
- [ ] **Advanced Analytics**: Correlations, best-time, seasonal trends.
- [ ] **Sound Design**: Optional terminal sound effects.
- [ ] **Keyboard Shortcuts**: Full vim-like navigation help overlay.
- [ ] **Public Board Embeds**: iframe widget for personal blogs.
- [ ] **Zapier / Webhook Integrations**.

---

## 7. Technical Debt & Architecture

### 7.1 Immediate Cleanup
- [ ] **Remove unused `icons.svg`**: The public folder has an `icons.svg` that appears unused. Verify and clean up.
- [ ] **Generate PWA icons**: The manifest references `icon-192x192.png` and `icon-512x512.png` but these don't exist. Generate from `favicon.svg` or use SVG icons if browsers support them.
- [ ] **Error boundary**: No React error boundary exists. A crash anywhere unmounts the whole app. Wrap routes in an `ErrorBoundary` with a thematic crash screen.
- [ ] **API error handling**: Pages still `.catch(console.error)` in places. Wrap in user-visible error states with retry buttons.

### 7.2 State Management
Currently all state is local + API calls. This is fine for MVP, but as features grow:
- Consider **TanStack Query (React Query)** for caching, deduping, background refetching, and optimistic updates.
- Consider **Zustand** for global UI state (toasts, command palette, theme prefs).

### 7.3 Testing
Zero tests currently. Priority order:
1. **Unit tests** for `lib/utils.ts` (date formatting, heatmap colors)
2. **Component tests** for modals (Escape closes, submit works, error shows)
3. **E2E tests** for critical flow: login -> create board -> create habit -> log entry -> view heatmap

### 7.4 Performance
- Bundle size is good (~317KB gzipped ~95KB). No immediate concern.
- **Lazy load routes**: `React.lazy()` for Dashboard, BoardView, HabitView, Profile to reduce initial bundle.
- **Preload heatmap data**: On dashboard, prefetch board stats in parallel.

### 7.5 Accessibility (A11y)
- [ ] **Focus trapping in modals**: Tab cycling within modal boundaries.
- [ ] **Screen reader announcements**: Use `aria-live` regions for toast messages and dynamic content updates.
- [ ] **Color contrast audit**: Ensure all text meets WCAG AA against the dark backgrounds.
- [ ] **Reduced motion**: Respect `prefers-reduced-motion` for CRT effects, animations, and scanlines.

---

## 8. Theme Consistency Checklist

Use this checklist before shipping any new component:

- [ ] **No rounded corners** (unless it's a very intentional design choice)
- [ ] **No box shadows** (the CRT theme doesn't use elevation)
- [ ] **Monospace font** for all text (`font-mono` class)
- [ ] **Bracket labels** for headers: `[SECTION_NAME]`
- [ ] **Terminal comments** for helper text: `// description`
- [ ] **Border-only buttons** (no solid fills for primary actions -- use `border-primary bg-primary/10`)
- [ ] **Red for danger**, **amber for warnings**, **green for success**
- [ ] **Escape-to-close** on all modals
- [ ] **User-visible errors** (not console-only)
- [ ] **Loading state** that matches terminal aesthetic
- [ ] **Dark theme only** (no `dark:` Tailwind variants needed)

---

## 9. Quick Wins (Can Do This Week)

If you only have a few hours, do these in order:

1. **Wire up the Board Settings button** → Create an `EditBoardModal`. This is the #1 dead end.
2. **Add Habit Edit button** → Create an `EditHabitModal`.
3. **Add Entry Edit** → Allow inline editing or an `EditEntryModal`.
4. **Dynamic document titles** → `useEffect(() => { document.title = ... }, [])` on each page.
5. **404 page** → Fun, thematic, takes 15 minutes.
6. **Footer status bar** → Add a live clock and network status.
7. **VT323 font on headers** → Change `h1, h2` to use VT323 via CSS.

---

## 10. Metrics to Track

Once analytics are added (post-MVP), watch these:

- **Daily Active Users (DAU)** -- Is the Today page driving daily opens?
- **Habit Creation Rate** -- Are templates increasing creation?
- **Entry Completion Rate** -- Are users actually logging?
- **Streak Retention** -- Users with 7+ day streaks are sticky.
- **Session Duration** -- Are users exploring or just logging and leaving?
- **Error Rate** -- Track API failures and uncaught exceptions.

---

*This document should be revisited monthly. Mark completed items and re-prioritize based on user feedback.*
