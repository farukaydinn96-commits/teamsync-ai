# ⚡ TeamSync AI — Real-Time Collaborative Engineering Workspace & AI Sprint Planner

**One-Line Purpose:** A full-stack real-time engineering workspace combining multi-channel Socket.io messaging, drag-and-drop Kanban sprint management, debounced collaborative markdown/code editing, and rate-limited Gemini 2.5 Flash sprint automation.

- **Live Demo (Vercel):** [https://teamsync-workspace-three.vercel.app](https://teamsync-workspace-three.vercel.app)
- **Backend Health & Telemetry (Render):** [https://teamsync-ai.onrender.com/api/health](https://teamsync-ai.onrender.com/api/health)

---

## 🏗️ System Architecture

    [React 19 + Tailwind v4 SPA]
          │  ├── Optimistic LocalStorage Cache (0ms channel switching)
          │  ├── Socket.io WebSocket (join_room, sync_doc_live, task events)
          │  └── Warm RTT Ping Probe (performance.now() -> /api/health)
          ▼
    [Node.js + Express + Socket.io Server]
          │  ├── Helmet Security Headers & CORS Origin Guard
          │  ├── Sliding-Window IP Rate Limiter (5 AI req/min, 120/day)
          │  ├── RBAC Permission Guard (Tech Lead vs Developer roles)
          │  └── Idempotent Task Deduplicator (/plan duplicate prevention)
          ├──► [MongoDB Atlas] (Indexed by room; 800ms debounced document writes)
          └──► [Google Gemini 2.5 Flash SDK] (with Deterministic Fallback Engine)

---

## ✨ Key Engineering Decisions & Features

### 1. Hybrid AI Automation: Live Gemini 2.5 Flash + Deterministic Fallback
- **How it works:** When a user triggers `/plan [feature]` or `/ai [prompt]`, the server first checks the sliding-window rate limiter (`backend/utils/rateLimiter.js`: max **5 requests/min per IP** and **120 requests/day globally**).
- **Resilience:** If `GEMINI_API_KEY` is active and within quota, tasks and code snippets are generated live via `gemini-2.5-flash` (badged as `⚡ Gemini 2.5 Flash Live`). If the quota is exhausted or the external API times out, the server seamlessly degrades to a **Deterministic Fallback Engine** (`🛡️ Fallback Template`) so the demo never breaks during recruiter evaluations.

### 2. Idempotent Sprint Planning & Balanced Seed Metrics
- Repeatedly clicking `/plan` will **never** bloat the Kanban board: `deduplicatePlanTasks()` filters out existing task titles case-insensitively before inserting.
- Generated tasks are automatically distributed across team members (`Faruk_Lead`, `Mert_Backend`, `Ece_Frontend`, `Zeynep_QA`) and priority tiers (`High`, `Medium`, `Low`).
- Includes a 1-click **`🔄 Reset Demo`** button in the top bar to restore the workspace to a clean **63% Sprint Progress** state (5 Done, 2 In Progress, 1 To Do) and pre-populated poll votes (`58% / 25% / 17%`).

### 3. Role-Based Access Control (RBAC) in Recruiter Demo Mode
- Switching between **`👑 Tech Lead (Faruk_Lead)`**, **`⚡ Frontend Dev (Ece_Frontend)`**, and **`🛠️ Backend Dev (Mert_Backend)`** in the bottom-left sidebar changes actual workspace permissions:
  - Only **Tech Lead** can execute `/plan` to generate sprint tasks or delete `High`-priority tasks.
  - Attempting `/plan` as a standard Developer triggers an immediate RBAC policy guard message.

### 4. Real-Time Verification: Two-Tab Test or 1-Click Teammate Simulator
- **Option A (1-Click Simulator):** Click **`🤖 Simulate Teammate`** in the top header to watch a simulated teammate (`Ece_Frontend`) broadcast a real-time chat message and move a Kanban card across columns.
- **Option B (Two-Tab Socket.io Test):** Open the live URL in two side-by-side browser windows, select `Faruk_Lead` in Window 1 and `Ece_Frontend` in Window 2, and drag a Kanban card or type in the **Docs & Code** tab to observe instant WebSocket synchronization.

### 5. How the `Live (ms)` Latency Indicator Is Measured
- `App.jsx` measures round-trip time (RTT) using high-resolution `performance.now()` timestamps around a `fetch('/api/health', { cache: 'no-store' })` probe every 20 seconds. If the initial probe wakes a sleeping container (`>800ms` cold start), a second warm probe is immediately fired to display accurate warm transport latency.

---

## ⚠️ Known Limitations & Trade-Offs

1. **Collaborative Document Concurrency (Last-Write-Wins):**
   - Keystrokes in the **Docs & Code** tab are broadcast immediately via `sync_doc_live` and persisted to MongoDB after an **800ms debounce** (`save_doc_db`) to prevent database write amplification.
   - Because full CRDT/OT (e.g., Yjs) was intentionally omitted to keep the client bundle lightweight, simultaneous edits by two users within the same 800ms window follow a **Last-Write-Wins (LWW)** model.
2. **In-Memory Rate Limiter State:**
   - The IP rate limiter uses an in-memory `Map` suitable for single-instance deployments; horizontal scaling across multiple Node instances would migrate this bucket to Redis (`INCR` + `EXPIRE`).

---

## 🧪 Running Automated Tests

    node --test backend/tests/workspace.test.js
