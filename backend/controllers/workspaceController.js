import Message from '../models/Message.js';
import Task from '../models/Task.js';
import Document from '../models/Document.js';

const FENCE = '\x60\x60\x60';

export const DEFAULT_DOCS = {
  general: `# TeamSync AI — Architecture & Sprint Notes\n\nReal-time collaborative markdown & code pad (800ms debounced MongoDB persistence, Last-Write-Wins concurrency).\n\n${FENCE}javascript\nexport const workspaceGuard = (allowedRoles = ['Tech Lead']) => (req, res, next) => {\n  const role = req.headers['x-workspace-role'] || 'Developer';\n  if (!allowedRoles.includes(role)) {\n    return res.status(403).json({ error: 'RBAC: Insufficient role permissions' });\n  }\n  next();\n};\n${FENCE}`,
  development: `# Technical Architecture & API Contracts\n\n- **Realtime Transport:** Socket.io rooms with automatic reconnection & RTT ping measurement\n- **AI Rate Limiting:** 5 req/min per IP + 120 req/day global cap with deterministic fallback\n- **Database:** MongoDB Atlas indexed by room`,
  'sprint-planning': `# Sprint 4 Goals & Capacity Allocation\n\n1. Maintain >60% sprint velocity across balanced High/Medium/Low tasks\n2. Enforce RBAC permissions on automated /plan generation\n3. Export sprint retrospectives in .md and .json formats`
};

export const SEED_TASKS = [
  {
    room: 'general',
    title: 'WebSocket (Socket.io) room isolation & RTT latency telemetry',
    status: 'done',
    priority: 'high',
    assignee: 'Faruk_Lead',
    subtasks: [
      { title: 'Configure join_room namespace isolation', completed: true },
      { title: 'Verify CORS & warm ping health check', completed: true }
    ]
  },
  {
    room: 'general',
    title: 'IP-based Rate Limiting & Helmet security headers for /ai and /plan',
    status: 'done',
    priority: 'high',
    assignee: 'Mert_Backend',
    subtasks: [
      { title: 'Implement sliding-window 5 req/min limiter', completed: true },
      { title: 'Add deterministic fallback when Gemini quota is reached', completed: true }
    ]
  },
  {
    room: 'general',
    title: 'Real-time collaborative document editor (800ms Debounce Auto-Save)',
    status: 'done',
    priority: 'medium',
    assignee: 'Ece_Frontend',
    subtasks: [
      { title: 'Broadcast live keystrokes via sync_doc_live', completed: true },
      { title: 'Persist debounced state to MongoDB', completed: true }
    ]
  },
  {
    room: 'general',
    title: 'Role-Based Access Control (RBAC) for Tech Lead vs Developer profiles',
    status: 'done',
    priority: 'medium',
    assignee: 'Faruk_Lead',
    subtasks: [
      { title: 'Restrict /plan automation to Tech Lead role', completed: true }
    ]
  },
  {
    room: 'general',
    title: 'Automated unit test suite (node:test) & GitHub Actions CI pipeline',
    status: 'done',
    priority: 'low',
    assignee: 'Zeynep_QA',
    subtasks: [
      { title: 'Write deduplication and rate-limiter unit tests', completed: true }
    ]
  },
  {
    room: 'general',
    title: 'Gemini 2.5 Flash /plan sprint task deduplication & assignee balancing',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Mert_Backend',
    subtasks: [
      { title: 'Prevent duplicate task titles on repeated /plan runs', completed: true },
      { title: 'Distribute generated tasks across team members', completed: false }
    ]
  },
  {
    room: 'general',
    title: 'Bilingual UI support (TR / EN language switcher) & Command Palette (⌘K)',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Ece_Frontend',
    subtasks: [
      { title: 'Add header language toggle', completed: true },
      { title: 'Verify keyboard shortcuts across views', completed: false }
    ]
  },
  {
    room: 'general',
    title: 'Sprint analytics export (.md & .json) with team workload breakdown',
    status: 'todo',
    priority: 'low',
    assignee: 'Zeynep_QA',
    subtasks: [
      { title: 'Validate JSON schema output', completed: false }
    ]
  },
  {
    room: 'development',
    title: 'Optimistic UI state reconciliation with LocalStorage persistence',
    status: 'done',
    priority: 'high',
    assignee: 'Faruk_Lead',
    subtasks: [
      { title: 'Zero-latency channel switching', completed: true },
      { title: 'Background REST hydration', completed: true }
    ]
  },
  {
    room: 'development',
    title: 'JWT & RBAC workspaceGuard middleware implementation',
    status: 'done',
    priority: 'medium',
    assignee: 'Mert_Backend',
    subtasks: [
      { title: 'Validate x-workspace-role header', completed: true }
    ]
  },
  {
    room: 'development',
    title: 'WebSocket reconnection backoff & offline queue handling',
    status: 'in-progress',
    priority: 'low',
    assignee: 'Ece_Frontend',
    subtasks: [
      { title: 'Test offline task creation sync', completed: true }
    ]
  },
  {
    room: 'sprint-planning',
    title: 'Q4 Sprint capacity planning & story point distribution',
    status: 'done',
    priority: 'high',
    assignee: 'Faruk_Lead',
    subtasks: [{ title: 'Finalize velocity targets', completed: true }]
  },
  {
    room: 'sprint-planning',
    title: 'Interactive Recruiter Demo role switching & live teammate simulation',
    status: 'done',
    priority: 'medium',
    assignee: 'Ece_Frontend',
    subtasks: [{ title: 'Add 1-click teammate simulation', completed: true }]
  },
  {
    room: 'sprint-planning',
    title: 'Mobile & tablet responsive Kanban layout refinements',
    status: 'todo',
    priority: 'low',
    assignee: 'Zeynep_QA',
    subtasks: [{ title: 'Test touch drag-and-drop fallback', completed: false }]
  }
];

export const SEED_MESSAGES = [
  {
    room: 'general',
    sender: 'Faruk_Lead',
    senderId: 'seed-1',
    text: 'Welcome team! Sprint 4 is at 63% completion (5/8 tasks done). You can test RBAC roles in the bottom-left sidebar or click "Simulate Teammate" in the top bar to watch live Socket.io updates.',
    isAi: false,
    isPinned: true,
    reactions: { '🚀': 4, '🔥': 3 }
  },
  {
    room: 'general',
    sender: 'TeamSync AI',
    senderId: 'ai-bot',
    text: '🤖 [Gemini 2.5 Flash + Fallback Engine Ready]: Trigger `/plan [feature]`, `/task [title]`, `/poll Question | Opt1 | Opt2`, or `/ai [question]`. Protected by IP rate limiting (5 req/min) and task deduplication.',
    isAi: true,
    isPinned: false,
    reactions: { '👍': 3 }
  },
  {
    room: 'general',
    sender: 'Ece_Frontend',
    senderId: 'seed-2',
    text: 'Kanban drag-and-drop, ⌘K Command Palette, and the TR/EN language toggle are live.',
    isAi: false,
    isPinned: false,
    reactions: { '❤️': 2 }
  },
  {
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
  },
  {
    room: 'development',
    sender: 'Faruk_Lead',
    senderId: 'seed-1',
    text: `Updated our RBAC authorization middleware (` + '`workspaceGuard`' + `) to enforce role permissions before executing privileged workspace actions:\n${FENCE}javascript\nexport const workspaceGuard = (allowedRoles = ['Tech Lead']) => (req, res, next) => {\n  const role = req.headers['x-workspace-role'] || 'Developer';\n  if (!allowedRoles.includes(role)) {\n    return res.status(403).json({ message: 'RBAC: Insufficient permissions' });\n  }\n  return next();\n};\n${FENCE}`,
    isAi: false,
    isPinned: true,
    reactions: { '🔥': 4 }
  }
];

export const resetAndSeedWorkspace = async () => {
  await Task.deleteMany({});
  await Message.deleteMany({});
  await Document.deleteMany({});

  await Task.insertMany(SEED_TASKS);
  await Message.insertMany(SEED_MESSAGES);
  await Document.insertMany(
    Object.entries(DEFAULT_DOCS).map(([room, content]) => ({ room, content }))
  );
};

export const seedInitialData = async () => {
  try {
    const generalTasks = await Task.find({ room: 'general' });
    const doneGeneral = generalTasks.filter((t) => t.status === 'done').length;
    const isPolluted =
      generalTasks.length === 0 ||
      generalTasks.length > 10 ||
      doneGeneral < 3;

    if (isPolluted) {
      console.log('Refreshing workspace seed data with balanced sprint metrics...');
      await resetAndSeedWorkspace();
    }
  } catch (error) {
    console.error('Seed error:', error.message);
  }
};

export const resetWorkspaceHandler = async (req, res) => {
  try {
    await resetAndSeedWorkspace();
    const room = req.body?.room || 'general';
    const [messages, tasks, doc] = await Promise.all([
      Message.find({ room }).sort({ createdAt: 1 }),
      Task.find({ room }).sort({ createdAt: 1 }),
      Document.findOne({ room })
    ]);
    res.json({ status: 'reset', messages, tasks, doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMessagesByRoom = async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTasksByRoom = async (req, res) => {
  try {
    const tasks = await Task.find({ room: req.params.room }).sort({ createdAt: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDocByRoom = async (req, res) => {
  try {
    const { room } = req.params;
    let doc = await Document.findOne({ room });
    if (!doc) {
      doc = await Document.create({
        room,
        content: DEFAULT_DOCS[room] || '# Channel Document\n\nWrite collaborative notes here...'
      });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
