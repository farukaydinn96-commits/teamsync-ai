import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Message from './models/Message.js';
import Task from './models/Task.js';
import Document from './models/Document.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import { seedInitialData, resetAndSeedWorkspace } from './controllers/workspaceController.js';
import {
  checkAiRateLimit,
  deduplicatePlanTasks,
  verifyRolePermission
} from './utils/rateLimiter.js';

dotenv.config();

const FENCE = '\x60\x60\x60';
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  '[https://teamsync-workspace-three.vercel.app](https://teamsync-workspace-three.vercel.app)',
  'http://localhost:5173',
  'http://localhost:4173'
].filter(Boolean);

const corsOriginHandler = (origin, callback) => {
  if (
    !origin ||
    allowedOrigins.includes(origin) ||
    /^https:\/\/teamsync-[a-z0-9-]+\.vercel\.app$/i.test(origin)
  ) {
    return callback(null, true);
  }
  return callback(new Error('Not allowed by CORS'));
};

app.use(helmet());
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true
  })
);
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (req, res) => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    mongoose.connection.db.admin().ping().catch(() => {});
  }
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'warming',
    aiConfigured: Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'buraya_kendi_gemini_api_keyini_yapistir'
    ),
    timestamp: Date.now()
  });
});

app.use('/api', workspaceRoutes);

const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
    .then(async () => {
      console.log('MongoDB Connected');
      await seedInitialData();
    })
    .catch((err) => console.warn('MongoDB connection warning:', err.message));
}

const genAI =
  process.env.GEMINI_API_KEY &&
  process.env.GEMINI_API_KEY !== 'buraya_kendi_gemini_api_keyini_yapistir'
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

const roomUsers = {};
const TEAM_ROSTER = ['Faruk_Lead', 'Ece_Frontend', 'Mert_Backend', 'Zeynep_QA'];
const PLAN_PRIORITIES = ['high', 'medium', 'medium', 'low'];

io.on('connection', (socket) => {
  const clientIp =
    socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    socket.handshake.address ||
    socket.id;

  socket.on('join_room', ({ room, username, isFocusing }) => {
    socket.join(room);
    socket.currentRoom = room;
    socket.username = username;

    if (!roomUsers[room]) roomUsers[room] = new Map();
    roomUsers[room].set(username, { username, isFocusing: Boolean(isFocusing) });

    io.to(room).emit('room_users', Array.from(roomUsers[room].values()));
  });

  socket.on('toggle_focus', ({ room, username, isFocusing }) => {
    if (roomUsers[room] && roomUsers[room].has(username)) {
      roomUsers[room].set(username, { username, isFocusing });
      io.to(room).emit('room_users', Array.from(roomUsers[room].values()));
    }
  });

  socket.on('sync_doc_live', ({ room, content }) => {
    socket.to(room).emit('doc_updated', content);
  });

  socket.on('save_doc_db', async ({ room, content }) => {
    try {
      await Document.findOneAndUpdate({ room }, { content }, { upsert: true });
      socket.emit('doc_saved_ack', { savedAt: new Date().toLocaleTimeString('tr-TR') });
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('reset_workspace', async ({ room }) => {
    try {
      await resetAndSeedWorkspace();
      const targetRoom = room || 'general';
      const [messages, tasks, doc] = await Promise.all([
        Message.find({ room: targetRoom }).sort({ createdAt: 1 }),
        Task.find({ room: targetRoom }).sort({ createdAt: 1 }),
        Document.findOne({ room: targetRoom })
      ]);
      io.to(targetRoom).emit('workspace_reset', {
        room: targetRoom,
        messages,
        tasks,
        doc: doc?.content || ''
      });
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      if (data.text.startsWith('/poll ')) {
        const rawPoll = data.text.replace('/poll ', '').trim();
        const parts = rawPoll
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);

        if (parts.length >= 2) {
          const question = parts[0];
          const options = parts.slice(1).map((opt, idx) => ({
            text: opt,
            votes: idx === 0 ? 1 : 0
          }));

          const pollMsg = await Message.create({
            room: data.room,
            sender: data.sender,
            senderId: data.senderId,
            text: `📊 Poll: ${question}`,
            poll: { question, options }
          });

          io.to(data.room).emit('receive_message', pollMsg);
          return;
        }
      }

      const savedMessage = await Message.create({
        room: data.room,
        sender: data.sender,
        senderId: data.senderId,
        text: data.text,
        replyTo: data.replyTo || null,
        isAi: false
      });

      io.to(data.room).emit('receive_message', savedMessage);

      if (data.text.startsWith('/task ')) {
        const taskTitle = data.text.replace('/task ', '').trim();
        if (taskTitle) {
          const newTask = await Task.create({
            room: data.room,
            title: taskTitle,
            status: 'todo',
            priority: 'medium',
            assignee: data.sender,
            subtasks: [
              { title: 'Analyze technical requirements', completed: false },
              { title: 'Implement & add unit tests', completed: false }
            ]
          });

          io.to(data.room).emit('task_created', newTask);

          const botMsg = await Message.create({
            room: data.room,
            sender: 'TeamSync AI',
            senderId: 'ai-bot',
            text: `✅ Task "${taskTitle}" created and assigned to ${data.sender} on the Kanban board.`,
            isAi: true
          });

          io.to(data.room).emit('receive_message', botMsg);
        }
        return;
      }

      if (data.text.startsWith('/plan ')) {
        const rbac = verifyRolePermission(data.sender, 'plan_sprint');
        if (!rbac.allowed) {
          const denyMsg = await Message.create({
            room: data.room,
            sender: 'TeamSync AI',
            senderId: 'ai-bot',
            text: `🔒 ${rbac.message}`,
            isAi: true
          });
          io.to(data.room).emit('receive_message', denyMsg);
          return;
        }

        const rateStatus = checkAiRateLimit(clientIp);
        if (!rateStatus.allowed) {
          const limitMsg = await Message.create({
            room: data.room,
            sender: 'TeamSync AI',
            senderId: 'ai-bot',
            text: `⏳ [Rate Limiter]: ${rateStatus.reason}`,
            isAi: true
          });
          io.to(data.room).emit('receive_message', limitMsg);
          return;
        }

        const topic = data.text.replace('/plan ', '').trim();
        if (topic) {
          let generatedTasks = [
            `${topic} - Schema & Architecture Design`,
            `${topic} - REST/Socket API & Security Guard`,
            `${topic} - UI Components & State Integration`,
            `${topic} - Automated Integration Tests`
          ];
          let engineLabel = '🛡️ Deterministic Fallback Engine';

          if (genAI) {
            try {
              const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
              const result = await model.generateContent(
                `Write 4 concise software engineering sprint task titles for "${topic}". One task per line, no bullets or numbers.`
              );
              const lines = result.response
                .text()
                .split('\n')
                .map((l) => l.replace(/^[-*0-9.)\s]+/, '').trim())
                .filter(Boolean)
                .slice(0, 4);
              if (lines.length >= 2) {
                generatedTasks = lines;
                engineLabel = '⚡ Gemini 2.5 Flash (Live API)';
              }
            } catch (err) {
              console.warn('Gemini fallback used:', err.message);
            }
          }

          const existingRoomTasks = await Task.find({ room: data.room });
          const uniqueTitles = deduplicatePlanTasks(existingRoomTasks, generatedTasks);

          if (uniqueTitles.length === 0) {
            const dupMsg = await Message.create({
              room: data.room,
              sender: 'TeamSync AI',
              senderId: 'ai-bot',
              text: `ℹ️ [Idempotency Guard]: Sprint tasks for "${topic}" already exist on the Kanban board. Duplicate task creation was prevented to keep sprint metrics clean.`,
              isAi: true
            });
            io.to(data.room).emit('receive_message', dupMsg);
            return;
          }

          for (let i = 0; i < uniqueTitles.length; i++) {
            const title = uniqueTitles[i];
            const created = await Task.create({
              room: data.room,
              title,
              status: i === 0 ? 'in-progress' : 'todo',
              priority: PLAN_PRIORITIES[i % PLAN_PRIORITIES.length],
              assignee: TEAM_ROSTER[i % TEAM_ROSTER.length],
              subtasks: [
                { title: 'Complete implementation', completed: i === 0 },
                { title: 'Pass PR review & unit tests', completed: false }
              ]
            });
            io.to(data.room).emit('task_created', created);
          }

          const planMsg = await Message.create({
            room: data.room,
            sender: 'TeamSync AI',
            senderId: 'ai-bot',
            text:
              `🚀 [${engineLabel}]: Created ${uniqueTitles.length} deduplicated sprint tasks for "${topic}" across team members:\n` +
              uniqueTitles
                .map(
                  (t, i) =>
                    `• [${PLAN_PRIORITIES[i % PLAN_PRIORITIES.length].toUpperCase()}] ${t} → @${TEAM_ROSTER[i % TEAM_ROSTER.length]}`
                )
                .join('\n'),
            isAi: true
          });

          io.to(data.room).emit('receive_message', planMsg);
        }
        return;
      }

      if (data.text.startsWith('/ai ')) {
        const rateStatus = checkAiRateLimit(clientIp);
        if (!rateStatus.allowed) {
          const limitMsg = await Message.create({
            room: data.room,
            sender: 'TeamSync AI',
            senderId: 'ai-bot',
            text: `⏳ [Rate Limiter]: ${rateStatus.reason}`,
            isAi: true
          });
          io.to(data.room).emit('receive_message', limitMsg);
          return;
        }

        const prompt = data.text.replace('/ai ', '').trim();
        let aiReplyText =
          `🤖 [🛡️ Deterministic Fallback Template — "${prompt}"]:\n` +
          `${FENCE}javascript\nexport const workspaceGuard = (allowedRoles = ['Tech Lead', 'Admin']) => {\n  return (req, res, next) => {\n    const userRole = req.headers['x-workspace-role'];\n    const token = req.headers.authorization?.split(' ')[1];\n    if (!token || !allowedRoles.includes(userRole)) {\n      return res.status(403).json({\n        error: 'Forbidden: Insufficient RBAC role permissions'\n      });\n    }\n    return next();\n  };\n};\n${FENCE}`;

        if (genAI) {
          try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(
              `You are TeamSync AI, a senior software engineering assistant. Give a concise, production-grade answer with clean code if applicable: ${prompt}`
            );
            aiReplyText = `🤖 [⚡ Gemini 2.5 Flash Live]:\n${result.response.text()}`;
          } catch (aiErr) {
            console.warn('Gemini fallback used:', aiErr.message);
          }
        }

        const aiMessage = await Message.create({
          room: data.room,
          sender: 'TeamSync AI',
          senderId: 'ai-bot',
          text: aiReplyText,
          isAi: true
        });

        io.to(data.room).emit('receive_message', aiMessage);
      }
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('vote_poll', async ({ room, messageId, optionIndex }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || !msg.poll || !msg.poll.options[optionIndex]) return;
      msg.poll.options[optionIndex].votes += 1;
      await msg.save();
      io.to(room).emit('message_updated', msg);
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('react_message', async ({ room, messageId, emoji }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      const currentCount = msg.reactions.get(emoji) || 0;
      msg.reactions.set(emoji, currentCount + 1);
      await msg.save();
      io.to(room).emit('message_updated', msg);
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('pin_message', async ({ room, messageId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      msg.isPinned = !msg.isPinned;
      await msg.save();
      io.to(room).emit('message_updated', msg);
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('create_task', async (data) => {
    try {
      const existing = await Task.findOne({
        room: data.room,
        title: { $regex: new RegExp(`^${data.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (existing) return;

      const newTask = await Task.create({
        room: data.room,
        title: data.title,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        assignee: data.assignee,
        subtasks: data.subtasks || []
      });
      io.to(data.room).emit('task_created', newTask);
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('add_subtask', async ({ room, taskId, title }) => {
    try {
      const task = await Task.findById(taskId);
      if (!task) return;
      task.subtasks.push({ title, completed: false });
      await task.save();
      io.to(room).emit('task_updated', task);
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('toggle_subtask', async ({ room, taskId, subtaskId }) => {
    try {
      const task = await Task.findById(taskId);
      if (!task) return;
      const sub = task.subtasks.id(subtaskId);
      if (sub) {
        sub.completed = !sub.completed;
        await task.save();
        io.to(room).emit('task_updated', task);
      }
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('update_task_status', async (data) => {
    try {
      const updatedTask = await Task.findByIdAndUpdate(
        data.taskId,
        { status: data.status },
        { new: true }
      );
      if (updatedTask) io.to(data.room).emit('task_updated', updatedTask);
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('delete_task', async (data) => {
    try {
      await Task.findByIdAndDelete(data.taskId);
      io.to(data.room).emit('task_deleted', data.taskId);
    } catch (error) {
      console.error(error.message);
    }
  });

  socket.on('disconnect', () => {
    const { currentRoom, username } = socket;
    if (currentRoom && roomUsers[currentRoom] && username) {
      roomUsers[currentRoom].delete(username);
      io.to(currentRoom).emit('room_users', Array.from(roomUsers[currentRoom].values()));
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`TeamSync AI Server running on port ${PORT}`));
