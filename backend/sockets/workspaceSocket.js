import Message from '../models/Message.js';
import Task from '../models/Task.js';
import Document from '../models/Document.js';
import { checkAiRateLimit, deduplicatePlanTasks, extractClientIp } from '../utils/rateLimiter.js';
import { signDemoToken, verifySocketAction, verifyTokenClaims } from '../middleware/workspaceGuard.js';
import {
  roomSchema,
  messagePayloadSchema,
  taskPayloadSchema,
  docPayloadSchema,
  normalizeTaskTitle
} from '../utils/validators.js';

const FENCE = '```';
const TEAM_ROSTER = ['Faruk_Lead', 'Ece_Frontend', 'Mert_Backend', 'Zeynep_QA'];
const PLAN_PRIORITIES = ['high', 'medium', 'medium', 'low'];

const withTimeout = (promise, ms = 8000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini request timed out')), ms))
  ]);

export const registerWorkspaceSockets = (io, genAI) => {
  const roomUsers = {};

  io.use((socket, next) => {
    const rawToken = socket.handshake.auth?.token;
    if (rawToken) {
      try {
        socket.user = verifyTokenClaims(rawToken);
        return next();
      } catch {
        // Fallback to signed guest token on initial handshake
      }
    }
    const fallbackUser = String(socket.handshake.auth?.username || 'Faruk_Lead').trim().slice(0, 40);
    const fallbackRole = fallbackUser === 'Faruk_Lead' ? 'Tech Lead' : 'Developer';
    const signed = signDemoToken({ username: fallbackUser, role: fallbackRole });
    socket.user = { username: fallbackUser, role: fallbackRole, token: signed };
    return next();
  });

  io.on('connection', (socket) => {
    const clientIp = extractClientIp(
      socket.handshake.headers['x-forwarded-for'],
      socket.handshake.address || socket.id
    );

    const hasJoinedRoom = (room) => Boolean(room && socket.rooms.has(room));

    socket.on('join_room', ({ room, isFocusing, token }) => {
      const validRoom = roomSchema.safeParse(room);
      if (!validRoom.success) {
        socket.emit('error_notice', { message: 'Unauthorized or invalid room identifier' });
        return;
      }

      if (token) {
        try {
          socket.user = verifyTokenClaims(token);
        } catch {}
      }

      const cleanRoom = validRoom.data;
      if (socket.currentRoom && socket.currentRoom !== cleanRoom) {
        socket.leave(socket.currentRoom);
      }

      const verifiedUsername = String(socket.user?.username || 'Faruk_Lead').slice(0, 40);
      socket.join(cleanRoom);
      socket.currentRoom = cleanRoom;
      socket.username = verifiedUsername;

      if (!roomUsers[cleanRoom]) roomUsers[cleanRoom] = new Map();
      roomUsers[cleanRoom].set(verifiedUsername, {
        username: verifiedUsername,
        isFocusing: Boolean(isFocusing)
      });

      io.to(cleanRoom).emit('room_users', Array.from(roomUsers[cleanRoom].values()));
    });

    socket.on('toggle_focus', ({ room, isFocusing }) => {
      const validRoom = roomSchema.safeParse(room);
      if (!validRoom.success || !hasJoinedRoom(validRoom.data)) return;
      const cleanRoom = validRoom.data;
      const verifiedUsername = socket.user?.username || socket.username;
      if (roomUsers[cleanRoom] && verifiedUsername && roomUsers[cleanRoom].has(verifiedUsername)) {
        roomUsers[cleanRoom].set(verifiedUsername, {
          username: verifiedUsername,
          isFocusing: Boolean(isFocusing)
        });
        io.to(cleanRoom).emit('room_users', Array.from(roomUsers[cleanRoom].values()));
      }
    });

    socket.on('sync_doc_live', (payload) => {
      const parsed = docPayloadSchema.safeParse(payload);
      if (!parsed.success || !hasJoinedRoom(parsed.data.room)) return;
      socket.to(parsed.data.room).emit('doc_updated', parsed.data.content);
    });

    socket.on('save_doc_db', async (payload) => {
      try {
        const parsed = docPayloadSchema.safeParse(payload);
        if (!parsed.success || !hasJoinedRoom(parsed.data.room)) return;
        const doc = await Document.findOneAndUpdate(
          { room: parsed.data.room },
          { $set: { content: parsed.data.content }, $inc: { version: 1 } },
          { upsert: true, new: true }
        );
        socket.emit('doc_saved_ack', {
          savedAt: new Date().toLocaleTimeString('en-US'),
          version: doc.version
        });
      } catch (error) {
        console.error(error.message);
      }
    });

    socket.on('send_message', async (rawPayload) => {
      try {
        if (rawPayload?.token) {
          try {
            socket.user = verifyTokenClaims(rawPayload.token);
          } catch {}
        }
        const verifiedSender = String(socket.user?.username || 'Faruk_Lead').slice(0, 40);
        const parsed = messagePayloadSchema.safeParse({
          ...rawPayload,
          sender: verifiedSender
        });
        if (!parsed.success || !hasJoinedRoom(parsed.data.room)) return;
        const data = parsed.data;

        if (data.text.startsWith('/poll ')) {
          const rawPoll = data.text.replace('/poll ', '').trim();
          const parts = rawPoll
            .split('|')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 7);

          if (parts.length >= 2) {
            const question = parts[0].slice(0, 140);
            const options = parts.slice(1).map((opt, idx) => ({
              text: opt.slice(0, 80),
              votes: idx === 0 ? 1 : 0
            }));

            const pollMsg = await Message.create({
              room: data.room,
              sender: verifiedSender,
              senderId: socket.id,
              text: `📊 Poll: ${question}`,
              poll: { question, options }
            });

            io.to(data.room).emit('receive_message', pollMsg);
            return;
          }
        }

        const savedMessage = await Message.create({
          room: data.room,
          sender: verifiedSender,
          senderId: socket.id,
          text: data.text,
          replyTo: data.replyTo || null,
          isAi: false
        });

        io.to(data.room).emit('receive_message', savedMessage);

        if (data.text.startsWith('/task ')) {
          const taskTitle = data.text.replace('/task ', '').trim().slice(0, 140);
          if (taskTitle) {
            const newTask = await Task.create({
              room: data.room,
              title: taskTitle,
              normalizedTitle: normalizeTaskTitle(taskTitle),
              status: 'todo',
              priority: 'medium',
              assignee: verifiedSender,
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
              text: `✅ Task "${taskTitle}" created and assigned to ${verifiedSender} on the Kanban board.`,
              isAi: true
            });

            io.to(data.room).emit('receive_message', botMsg);
          }
          return;
        }

        if (data.text.startsWith('/plan ')) {
          const jwtAuth = verifySocketAction(
            rawPayload.token || socket.handshake.auth?.token,
            ['Tech Lead']
          );
          if (!jwtAuth.allowed) {
            const denyMsg = await Message.create({
              room: data.room,
              sender: 'TeamSync AI',
              senderId: 'ai-bot',
              text: `🔒 [HTTP ${jwtAuth.statusCode} — ${jwtAuth.message}]: Signed JWT claim verification failed for /plan. Switch to "👑 Tech Lead" to obtain a signed Tech Lead JWT.`,
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

          const topic = data.text.replace('/plan ', '').trim().slice(0, 80);
          if (topic) {
            let generatedTasks = [
              `${topic} - Schema & Architecture Design`,
              `${topic} - REST/Socket API & Security Guard`,
              `${topic} - UI Components & State Integration`,
              `${topic} - Automated Integration Tests`
            ];
            let engineLabel = '🛡️ Deterministic Fallback Template';

            if (genAI) {
              try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const result = await withTimeout(
                  model.generateContent(
                    `Write 4 concise software engineering sprint task titles for "${topic}". One task per line, no bullets or numbers.`
                  ),
                  8000
                );
                const lines = result.response
                  .text()
                  .split('\n')
                  .map((l) => l.replace(/^[-*0-9.)\s]+/, '').trim().slice(0, 140))
                  .filter((l) => l.length >= 4)
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
                text: `ℹ️ [Duplicate-Preventing Guard]: Sprint tasks for "${topic}" already exist on the Kanban board.`,
                isAi: true
              });
              io.to(data.room).emit('receive_message', dupMsg);
              return;
            }

            const insertedTitles = [];
            for (let i = 0; i < uniqueTitles.length; i++) {
              const title = uniqueTitles[i];
              try {
                const created = await Task.create({
                  room: data.room,
                  title,
                  normalizedTitle: normalizeTaskTitle(title),
                  status: i === 0 ? 'in-progress' : 'todo',
                  priority: PLAN_PRIORITIES[i % PLAN_PRIORITIES.length],
                  assignee: TEAM_ROSTER[i % TEAM_ROSTER.length],
                  subtasks: [
                    { title: 'Complete implementation', completed: i === 0 },
                    { title: 'Pass PR review & unit tests', completed: false }
                  ]
                });
                insertedTitles.push(created.title);
                io.to(data.room).emit('task_created', created);
              } catch {}
            }

            if (insertedTitles.length > 0) {
              const planMsg = await Message.create({
                room: data.room,
                sender: 'TeamSync AI',
                senderId: 'ai-bot',
                text:
                  `🚀 [${engineLabel}]: Created ${insertedTitles.length} sprint tasks for "${topic}":\n` +
                  insertedTitles
                    .map(
                      (t, i) =>
                        `• [${PLAN_PRIORITIES[i % PLAN_PRIORITIES.length].toUpperCase()}] ${t} → @${TEAM_ROSTER[i % TEAM_ROSTER.length]}`
                    )
                    .join('\n'),
                isAi: true
              });
              io.to(data.room).emit('receive_message', planMsg);
            }
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

          const prompt = data.text.replace('/ai ', '').trim().slice(0, 300);
          let aiReplyText =
            `🤖 [🛡️ Deterministic Fallback Template — "${prompt}"]:\n` +
            FENCE +
            `javascript\nimport jwt from 'jsonwebtoken';\n\nexport const workspaceGuard = (allowedRoles = ['Tech Lead']) => (req, res, next) => {\n  try {\n    const token = req.headers.authorization?.split(' ')[1];\n    const { username, role } = jwt.verify(token, process.env.JWT_SECRET);\n    if (!role || !allowedRoles.includes(role)) {\n      return res.status(403).json({ message: 'RBAC: Insufficient permissions' });\n    }\n    req.user = { username, role };\n    return next();\n  } catch {\n    return res.status(401).json({ message: 'Invalid or missing token' });\n  }\n};\n` +
            FENCE;

          if (genAI) {
            try {
              const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
              const result = await withTimeout(
                model.generateContent(
                  `You are TeamSync AI, a senior software engineering assistant. Give a concise, production-grade answer with clean code if applicable: ${prompt}`
                ),
                8000
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
        const validRoom = roomSchema.safeParse(room);
        if (!validRoom.success || !hasJoinedRoom(validRoom.data)) return;
        const idx = Number(optionIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx > 10) return;
        const msg = await Message.findOne({ _id: String(messageId), room: validRoom.data });
        if (!msg || !msg.poll || !msg.poll.options?.[idx]) return;
        msg.poll.options[idx].votes += 1;
        await msg.save();
        io.to(validRoom.data).emit('message_updated', msg);
      } catch {}
    });

    socket.on('react_message', async ({ room, messageId, emoji }) => {
      try {
        const validRoom = roomSchema.safeParse(room);
        if (!validRoom.success || !hasJoinedRoom(validRoom.data)) return;
        const cleanEmoji = String(emoji || '').trim().slice(0, 8);
        if (!cleanEmoji) return;
        const msg = await Message.findOne({ _id: String(messageId), room: validRoom.data });
        if (!msg) return;
        const currentCount = msg.reactions.get(cleanEmoji) || 0;
        msg.reactions.set(cleanEmoji, currentCount + 1);
        await msg.save();
        io.to(validRoom.data).emit('message_updated', msg);
      } catch {}
    });

    socket.on('pin_message', async ({ room, messageId }) => {
      try {
        const validRoom = roomSchema.safeParse(room);
        if (!validRoom.success || !hasJoinedRoom(validRoom.data)) return;
        const msg = await Message.findOne({ _id: String(messageId), room: validRoom.data });
        if (!msg) return;
        msg.isPinned = !msg.isPinned;
        await msg.save();
        io.to(validRoom.data).emit('message_updated', msg);
      } catch {}
    });

    socket.on('create_task', async (rawPayload) => {
      try {
        const verifiedAssignee = String(socket.user?.username || rawPayload?.assignee || 'Faruk_Lead').slice(0, 40);
        const parsed = taskPayloadSchema.safeParse({
          ...rawPayload,
          assignee: verifiedAssignee
        });
        if (!parsed.success || !hasJoinedRoom(parsed.data.room)) return;
        const data = parsed.data;

        const newTask = await Task.create({
          room: data.room,
          title: data.title,
          normalizedTitle: normalizeTaskTitle(data.title),
          status: data.status,
          priority: data.priority,
          assignee: data.assignee,
          subtasks: data.subtasks
        });
        io.to(data.room).emit('task_created', newTask);
      } catch {}
    });

    socket.on('update_task_status', async ({ room, taskId, status }) => {
      try {
        const validRoom = roomSchema.safeParse(room);
        if (!validRoom.success || !hasJoinedRoom(validRoom.data)) return;
        if (!['todo', 'in-progress', 'done'].includes(status)) return;
        const updatedTask = await Task.findOneAndUpdate(
          { _id: String(taskId), room: validRoom.data },
          { status },
          { new: true }
        );
        if (updatedTask) {
          io.to(validRoom.data).emit('task_updated', updatedTask);
        }
      } catch {}
    });

    socket.on('add_subtask', async ({ room, taskId, title }) => {
      try {
        const validRoom = roomSchema.safeParse(room);
        if (!validRoom.success || !hasJoinedRoom(validRoom.data)) return;
        const cleanTitle = String(title || '').trim().slice(0, 120);
        if (!cleanTitle) return;
        const task = await Task.findOne({ _id: String(taskId), room: validRoom.data });
        if (!task) return;
        task.subtasks.push({ title: cleanTitle, completed: false });
        await task.save();
        io.to(validRoom.data).emit('task_updated', task);
      } catch {}
    });

    socket.on('toggle_subtask', async ({ room, taskId, subtaskId }) => {
      try {
        const validRoom = roomSchema.safeParse(room);
        if (!validRoom.success || !hasJoinedRoom(validRoom.data)) return;
        const task = await Task.findOne({ _id: String(taskId), room: validRoom.data });
        if (!task) return;
        const sub = task.subtasks.id(String(subtaskId));
        if (sub) {
          sub.completed = !sub.completed;
          await task.save();
          io.to(validRoom.data).emit('task_updated', task);
        }
      } catch {}
    });

    socket.on('delete_task', async (data) => {
      try {
        const jwtAuth = verifySocketAction(
          data?.token || socket.handshake.auth?.token,
          ['Tech Lead']
        );
        if (!jwtAuth.allowed) return;
        const validRoom = roomSchema.safeParse(data?.room);
        if (!validRoom.success || !hasJoinedRoom(validRoom.data)) return;
        await Task.findOneAndDelete({ _id: String(data.taskId), room: validRoom.data });
        io.to(validRoom.data).emit('task_deleted', data.taskId);
      } catch {}
    });

    socket.on('disconnect', () => {
      const { currentRoom, username } = socket;
      if (currentRoom && roomUsers[currentRoom] && username) {
        roomUsers[currentRoom].delete(username);
        io.to(currentRoom).emit('room_users', Array.from(roomUsers[currentRoom].values()));
      }
    });
  });
};
