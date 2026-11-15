import Message from '../models/Message.js';
import Task from '../models/Task.js';
import Document from '../models/Document.js';
import { roomSchema, normalizeTaskTitle } from '../utils/validators.js';

const FENCE = '\x60\x60\x60';

export const DEFAULT_DOCS = {
  general: `# TeamSync AI — Architecture & Sprint Notes\n\nReal-time collaborative markdown & code pad (800ms debounced MongoDB persistence, Last-Write-Wins concurrency).\n\n${FENCE}javascript\nimport jwt from 'jsonwebtoken';\n\nexport const workspaceGuard = (allowedRoles = ['Tech Lead']) => (req, res, next) => {\n  try {\n    const token = req.headers.authorization?.split(' ')[1];\n    const { username, role } = jwt.verify(token, process.env.JWT_SECRET);\n    if (!role || !allowedRoles.includes(role)) {\n      return res.status(403).json({ message: 'RBAC: Insufficient permissions' });\n    }\n    req.user = { username, role };\n    return next();\n  } catch {\n    return res.status(401).json({ message: 'Invalid or missing token' });\n  }\n};\n${FENCE}`,
  development: `# Technical Architecture & API Contracts\n\n- **Auth:** Signed JWT (HS256) verified in REST middleware & Socket.io handshake\n- **Rate Limiting:** 5 req/min per IP (with trust proxy enabled) + 120 req/day cap\n- **Database:** MongoDB Atlas with unique (room, normalizedTitle) index & 24h TTL`,
  'sprint-planning': `# Sprint 4 Goals & Capacity Allocation\n\n1. Maintain >60% sprint velocity across balanced High/Medium/Low tasks\n2. Enforce signed JWT RBAC permissions on automated /plan generation\n3. Export sprint retrospectives in .md and .json formats`
};

export const SEED_TASKS = [
  {
    room: 'general',
    title: 'WebSocket (Socket.io) session-scoped room isolation & RTT telemetry',
    normalizedTitle: normalizeTaskTitle('WebSocket (Socket.io) session-scoped room isolation & RTT telemetry'),
    status: 'done',
    priority: 'high',
    assignee: 'Faruk_Lead',
    subtasks: [
      { title: 'Configure session-isolated join_room namespaces', completed: true },
      { title: 'Verify CORS & warm ping health check', completed: true }
    ]
  },
  {
    room: 'general',
    title: 'Signed JWT RBAC middleware (workspaceGuard) & Socket handshake auth',
    normalizedTitle: normalizeTaskTitle('Signed JWT RBAC middleware (workspaceGuard) & Socket handshake auth'),
    status: 'done',
    priority: 'high',
    assignee: 'Mert_Backend',
    subtasks: [
      { title: 'Verify role claim from jwt.verify() instead of raw headers', completed: true },
      { title: 'Return 401 on missing token and 403 on insufficient role', completed: true }
    ]
  },
  {
    room: 'general',
    title: 'Real-time collaborative document editor (800ms Debounce Auto-Save)',
    normalizedTitle: normalizeTaskTitle('Real-time collaborative document editor (800ms Debounce Auto-Save)'),
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
    title: 'IP-based Rate Limiting (5 req/min) & Helmet security headers',
    normalizedTitle: normalizeTaskTitle('IP-based Rate Limiting (5 req/min) & Helmet security headers'),
    status: 'done',
    priority: 'medium',
    assignee: 'Faruk_Lead',
    subtasks: [
      { title: 'Enforce sliding-window quota on /plan and /ai', completed: true }
    ]
  },
  {
    room: 'general',
    title: 'Automated unit test suite (401/403 JWT, Rate Limit, Deduplication) & CI',
    normalizedTitle: normalizeTaskTitle('Automated unit test suite (401/403 JWT, Rate Limit, Deduplication) & CI'),
    status: 'done',
    priority: 'low',
    assignee: 'Zeynep_QA',
    subtasks: [
      { title: 'Run node:test in GitHub Actions workflow', completed: true }
    ]
  },
  {
    room: 'general',
    title: 'Gemini 2.5 Flash /plan sprint task deduplication & assignee balancing',
    normalizedTitle: normalizeTaskTitle('Gemini 2.5 Flash /plan sprint task deduplication & assignee balancing'),
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
    title: 'Centralized i18n dictionary (EN / TR) & compact responsive header menu',
    normalizedTitle: normalizeTaskTitle('Centralized i18n dictionary (EN / TR) & compact responsive header menu'),
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Ece_Frontend',
    subtasks: [
      { title: 'Remove mixed bilingual strings across views', completed: true },
      { title: 'Group secondary demo tools into header dropdown', completed: false }
    ]
  },
  {
    room: 'general',
    title: 'Sprint analytics export (.md & .json) with team workload breakdown',
    normalizedTitle: normalizeTaskTitle('Sprint analytics export (.md & .json) with team workload breakdown'),
    status: 'todo',
    priority: 'low',
    assignee: 'Zeynep_QA',
    subtasks: [
      { title: 'Validate JSON schema output', completed: false }
    ]
  }
];

export const SEED_MESSAGES = [
  {
    room: 'general',
    sender: 'Faruk_Lead',
    senderId: 'seed-1',
    text: 'Welcome team! Sprint 4 is at 63% completion (5 of 8 tasks Done). Each browser session runs in an isolated sandbox room so you can test freely without overwriting another visitor.',
    isAi: false,
    isPinned: true,
    reactions: { '🚀': 4, '🔥': 3 }
  },
  {
    room: 'general',
    sender: 'TeamSync AI',
    senderId: 'ai-bot',
    text: '🤖 [Gemini 2.5 Flash + Deterministic Fallback Engine]: Use /plan [feature], /task [title], /poll Question | Opt1 | Opt2, or /ai [question]. Protected by signed JWT role claims, IP rate limiting (5 req/min), and task deduplication.',
    isAi: true,
    isPinned: false,
    reactions: { '👍': 3 }
  },
  {
    room: 'general',
    sender: 'Ece_Frontend (Sim)',
    senderId: 'seed-2',
    text: '[Simulated Teammate]: Kanban drag-and-drop, ⌘K Command Palette, and pure EN/TR i18n dictionary switching are active.',
    isAi: false,
    isPinned: false,
    reactions: { '❤️': 2 }
  },
  {
    room: 'general',
    sender: 'Mert_Backend (Sim)',
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
];

export const resetAndSeedWorkspace = async () => {
  await Task.deleteMany({});
  await Message.deleteMany({});
  await Document.deleteMany({});

  await Task.insertMany(SEED_TASKS);
  await Message.insertMany(SEED_MESSAGES);
  await Document.insertMany(
    Object.entries(DEFAULT_DOCS).map(([room, content]) => ({ room, content, version: 1 }))
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
      await resetAndSeedWorkspace();
    }
  } catch (error) {
    console.warn('Seed warning:', error.message);
  }
};

export const resetWorkspaceHandler = async (req, res, next) => {
  try {
    await resetAndSeedWorkspace();
    const rawRoom = req.body?.room || 'general';
    const parsedRoom = roomSchema.safeParse(rawRoom);
    const baseRoom = parsedRoom.success && rawRoom.includes(':') ? rawRoom.split(':')[1] : 'general';

    const [messages, tasks, doc] = await Promise.all([
      Message.find({ room: baseRoom }).sort({ createdAt: 1 }),
      Task.find({ room: baseRoom }).sort({ createdAt: 1 }),
      Document.findOne({ room: baseRoom })
    ]);
    res.json({ status: 'reset', messages, tasks, doc });
  } catch (error) {
    next(error);
  }
};

export const getMessagesByRoom = async (req, res, next) => {
  try {
    const parsed = roomSchema.safeParse(req.params.room);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid room parameter' });
    }
    const messages = await Message.find({ room: parsed.data })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

export const getTasksByRoom = async (req, res, next) => {
  try {
    const parsed = roomSchema.safeParse(req.params.room);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid room parameter' });
    }
    const tasks = await Task.find({ room: parsed.data }).sort({ createdAt: 1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getDocByRoom = async (req, res, next) => {
  try {
    const parsed = roomSchema.safeParse(req.params.room);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid room parameter' });
    }
    const room = parsed.data;
    const baseRoom = room.includes(':') ? room.split(':')[1] : room;
    let doc = await Document.findOne({ room });
    if (!doc) {
      doc = await Document.create({
        room,
        content: DEFAULT_DOCS[baseRoom] || '# Channel Document\n\nWrite collaborative notes here...',
        version: 1
      });
    }
    res.json(doc);
  } catch (error) {
    next(error);
  }
};
