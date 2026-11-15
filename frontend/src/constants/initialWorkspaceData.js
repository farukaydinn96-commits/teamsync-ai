const FENCE = '\x60\x60\x60';

export const INITIAL_WORKSPACE_DATA = {
  general: {
    messages: [
      {
        _id: 'seed-msg-gen-1',
        room: 'general',
        sender: 'Faruk_Lead',
        senderId: 'seed-1',
        text: 'Welcome team! Sprint 4 is at 63% completion (5 of 8 tasks Done). Switch roles in the bottom-left RBAC panel or click "Simulate Teammate" in the top bar to watch live Socket.io events.',
        isAi: false,
        isPinned: true,
        reactions: { '🚀': 4, '🔥': 3 }
      },
      {
        _id: 'seed-msg-gen-2',
        room: 'general',
        sender: 'TeamSync AI',
        senderId: 'ai-bot',
        text: '🤖 [Gemini 2.5 Flash + Fallback Engine]: Use /plan [feature], /task [title], /poll Question | Opt1 | Opt2, or /ai [question]. Protected by IP rate limiting (5 req/min) and idempotent task deduplication.',
        isAi: true,
        isPinned: false,
        reactions: { '👍': 3 }
      },
      {
        _id: 'seed-msg-gen-3',
        room: 'general',
        sender: 'Ece_Frontend',
        senderId: 'seed-2',
        text: 'Kanban drag-and-drop, ⌘K Command Palette, and the EN/TR language toggle are ready for review.',
        isAi: false,
        isPinned: false,
        reactions: { '❤️': 2 }
      },
      {
        _id: 'seed-msg-gen-4',
        room: 'general',
        sender: 'Mert_Backend',
        senderId: 'seed-3',
        text: '📊 Poll: Distributed Cache & Rate-Limit Store Preference?',
        isAi: false,
        isPinned: false,
        reactions: { '🔥': 2 },
        poll: {
          question: 'Distributed Cache & Rate-Limit Store Preference?',
          options: [
            { text: 'Redis Cluster (Read-Through + TTL)', votes: 7 },
            { text: 'Upstash Serverless Redis', votes: 3 },
            { text: 'In-Memory Sliding Window', votes: 2 }
          ]
        }
      }
    ],
    tasks: [
      {
        _id: 'seed-task-gen-1',
        room: 'general',
        title: 'WebSocket (Socket.io) room isolation & RTT latency telemetry',
        status: 'done',
        priority: 'high',
        assignee: 'Faruk_Lead',
        subtasks: [
          { _id: 'st-gen-1', title: 'Configure join_room namespace isolation', completed: true },
          { _id: 'st-gen-2', title: 'Verify CORS & warm ping health check', completed: true }
        ]
      },
      {
        _id: 'seed-task-gen-2',
        room: 'general',
        title: 'IP-based Rate Limiting & Helmet security headers for /ai and /plan',
        status: 'done',
        priority: 'high',
        assignee: 'Mert_Backend',
        subtasks: [
          { _id: 'st-gen-3', title: 'Implement sliding-window 5 req/min limiter', completed: true },
          { _id: 'st-gen-4', title: 'Add deterministic fallback when Gemini quota is reached', completed: true }
        ]
      },
      {
        _id: 'seed-task-gen-3',
        room: 'general',
        title: 'Real-time collaborative document editor (800ms Debounce Auto-Save)',
        status: 'done',
        priority: 'medium',
        assignee: 'Ece_Frontend',
        subtasks: [
          { _id: 'st-gen-5', title: 'Broadcast live keystrokes via sync_doc_live', completed: true },
          { _id: 'st-gen-5b', title: 'Persist debounced state to MongoDB', completed: true }
        ]
      },
      {
        _id: 'seed-task-gen-4',
        room: 'general',
        title: 'Role-Based Access Control (RBAC) for Tech Lead vs Developer profiles',
        status: 'done',
        priority: 'medium',
        assignee: 'Faruk_Lead',
        subtasks: [
          { _id: 'st-gen-6', title: 'Restrict /plan automation to Tech Lead role', completed: true }
        ]
      },
      {
        _id: 'seed-task-gen-5',
        room: 'general',
        title: 'Automated unit test suite (node:test) & GitHub Actions CI pipeline',
        status: 'done',
        priority: 'low',
        assignee: 'Zeynep_QA',
        subtasks: [
          { _id: 'st-gen-7', title: 'Write deduplication and rate-limiter unit tests', completed: true }
        ]
      },
      {
        _id: 'seed-task-gen-6',
        room: 'general',
        title: 'Gemini 2.5 Flash /plan sprint task deduplication & assignee balancing',
        status: 'in-progress',
        priority: 'medium',
        assignee: 'Mert_Backend',
        subtasks: [
          { _id: 'st-gen-8', title: 'Prevent duplicate task titles on repeated /plan runs', completed: true },
          { _id: 'st-gen-9', title: 'Distribute generated tasks across team members', completed: false }
        ]
      },
      {
        _id: 'seed-task-gen-7',
        room: 'general',
        title: 'Bilingual UI support (EN / TR switcher) & Command Palette (⌘K)',
        status: 'in-progress',
        priority: 'medium',
        assignee: 'Ece_Frontend',
        subtasks: [
          { _id: 'st-gen-10', title: 'Add header language toggle', completed: true },
          { _id: 'st-gen-11', title: 'Verify keyboard shortcuts across views', completed: false }
        ]
      },
      {
        _id: 'seed-task-gen-8',
        room: 'general',
        title: 'Sprint analytics export (.md & .json) with team workload breakdown',
        status: 'todo',
        priority: 'low',
        assignee: 'Zeynep_QA',
        subtasks: [
          { _id: 'st-gen-12', title: 'Validate JSON schema output', completed: false }
        ]
      }
    ],
    doc: `# TeamSync AI — Architecture & Sprint Notes\n\nReal-time collaborative markdown & code pad (800ms debounced MongoDB persistence, Last-Write-Wins concurrency).\n\n${FENCE}javascript\nexport const workspaceGuard = (allowedRoles = ['Tech Lead', 'Admin']) => {\n  return (req, res, next) => {\n    const userRole = req.headers['x-workspace-role'];\n    const token = req.headers.authorization?.split(' ')[1];\n    if (!token || !allowedRoles.includes(userRole)) {\n      return res.status(403).json({ error: 'RBAC: Insufficient role permissions' });\n    }\n    return next();\n  };\n};\n${FENCE}`
  },
  development: {
    messages: [
      {
        _id: 'seed-msg-dev-1',
        room: 'development',
        sender: 'Faruk_Lead',
        senderId: 'seed-1',
        text: `Updated our RBAC authorization middleware (workspaceGuard) to validate JWT & role permissions before executing privileged actions:\n${FENCE}javascript\nexport const workspaceGuard = (allowedRoles = ['Tech Lead']) => (req, res, next) => {\n  const role = req.headers['x-workspace-role'] || 'Developer';\n  if (!allowedRoles.includes(role)) {\n    return res.status(403).json({ message: 'RBAC: Insufficient permissions' });\n  }\n  return next();\n};\n${FENCE}`,
        isAi: false,
        isPinned: true,
        reactions: { '🔥': 3 }
      },
      {
        _id: 'seed-msg-dev-2',
        room: 'development',
        sender: 'Mert_Backend',
        senderId: 'seed-3',
        text: 'MongoDB compound indexes added on room + createdAt; query latency is under 12ms.',
        isAi: false,
        isPinned: false,
        reactions: { '🚀': 2 }
      }
    ],
    tasks: [
      {
        _id: 'seed-task-dev-1',
        room: 'development',
        title: 'Optimistic UI state reconciliation with LocalStorage persistence',
        status: 'done',
        priority: 'high',
        assignee: 'Faruk_Lead',
        subtasks: [
          { _id: 'st-dev-1', title: 'Zero-latency channel switching', completed: true },
          { _id: 'st-dev-2', title: 'Background REST hydration', completed: true }
        ]
      },
      {
        _id: 'seed-task-dev-2',
        room: 'development',
        title: 'JWT & RBAC workspaceGuard middleware implementation',
        status: 'done',
        priority: 'medium',
        assignee: 'Mert_Backend',
        subtasks: [
          { _id: 'st-dev-3', title: 'Validate x-workspace-role header', completed: true }
        ]
      },
      {
        _id: 'seed-task-dev-3',
        room: 'development',
        title: 'WebSocket reconnection backoff & offline queue handling',
        status: 'in-progress',
        priority: 'low',
        assignee: 'Ece_Frontend',
        subtasks: [
          { _id: 'st-dev-4', title: 'Test offline task creation sync', completed: true }
        ]
      }
    ],
    doc: '# Technical Architecture & API Contracts\n\n- Backend: Node.js, Express, Socket.io, Helmet, IP Rate Limiter\n- Database: MongoDB Atlas\n- Frontend: React 19, Vite, Tailwind CSS v4, Optimistic Cache'
  },
  'sprint-planning': {
    messages: [
      {
        _id: 'seed-msg-sp-1',
        room: 'sprint-planning',
        sender: 'Faruk_Lead',
        senderId: 'seed-1',
        text: 'Sprint 4 capacity is locked. Tech Lead role can use "AI Sprint Plan (/plan)" in the sidebar to auto-generate deduplicated tasks.',
        isAi: false,
        isPinned: true,
        reactions: { '🚀': 2 }
      },
      {
        _id: 'seed-msg-sp-2',
        room: 'sprint-planning',
        sender: 'Ece_Frontend',
        senderId: 'seed-2',
        text: 'Sprint reports can be exported as .md or .json from the Analytics tab.',
        isAi: false,
        isPinned: false,
        reactions: { '👍': 2 }
      }
    ],
    tasks: [
      {
        _id: 'seed-task-sp-1',
        room: 'sprint-planning',
        title: 'Q4 Sprint capacity planning & story point distribution',
        status: 'done',
        priority: 'high',
        assignee: 'Faruk_Lead',
        subtasks: [{ _id: 'st-sp-1', title: 'Finalize velocity targets', completed: true }]
      },
      {
        _id: 'seed-task-sp-2',
        room: 'sprint-planning',
        title: 'Interactive Recruiter Demo role switching & live teammate simulation',
        status: 'done',
        priority: 'medium',
        assignee: 'Ece_Frontend',
        subtasks: [{ _id: 'st-sp-2', title: 'Add 1-click teammate simulation', completed: true }]
      },
      {
        _id: 'seed-task-sp-3',
        room: 'sprint-planning',
        title: 'Mobile & tablet responsive Kanban layout refinements',
        status: 'todo',
        priority: 'low',
        assignee: 'Zeynep_QA',
        subtasks: [{ _id: 'st-sp-3', title: 'Test touch drag-and-drop fallback', completed: false }]
      }
    ],
    doc: '# Sprint 4 Objectives\n\n1. Maintain >60% sprint completion rate\n2. Enforce RBAC permissions on automated sprint planning\n3. Provide real-time multi-user simulation for single-tab reviewers'
  }
};
