import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Message from './models/Message.js';
import Task from './models/Task.js';
import Document from './models/Document.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import { seedInitialData } from './controllers/workspaceController.js';

dotenv.config();

const FENCE = '\x60\x60\x60';
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://teamsync-workspace-three.vercel.app',
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

app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true
  })
);
app.use(express.json());

// Render Keep-Alive ve MongoDB bağlantı sıcaklığı kontrolü
app.get('/api/health', (req, res) => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    mongoose.connection.db.admin().ping().catch(() => {});
  }
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'warming',
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

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Baglandi');
    await seedInitialData();
  })
  .catch((err) => console.error(err.message));

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const roomUsers = {};

io.on('connection', (socket) => {
  socket.on('join_room', ({ room, username, isFocusing }) => {
    socket.join(room);
    socket.currentRoom = room;
    socket.username = username;

    if (!roomUsers[room]) roomUsers[room] = new Map();
    roomUsers[room].set(username, { username, isFocusing: !!isFocusing });

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
          const options = parts.slice(1).map((opt) => ({ text: opt, votes: 0 }));

          const pollMsg = await Message.create({
            room: data.room,
            sender: data.sender,
            senderId: data.senderId,
            text: `📊 Anket: ${question}`,
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
            priority: 'high',
            assignee: data.sender,
            subtasks: [
              { title: 'Gereksinimleri analiz et', completed: false },
              { title: 'Geliştirme ve testleri tamamla', completed: false }
            ]
          });

          io.to(data.room).emit('task_created', newTask);

          const botMsg = await Message.create({
            room: data.room,
            sender: 'TeamSync AI',
            senderId: 'ai-bot',
            text: `✅ "${taskTitle}" görevi alt adımlarıyla birlikte Kanban panosuna (${data.sender} adına) eklendi.`,
            isAi: true
          });

          io.to(data.room).emit('receive_message', botMsg);
        }
        return;
      }

      if (data.text.startsWith('/plan ')) {
        const topic = data.text.replace('/plan ', '').trim();
        if (topic) {
          let generatedTasks = [
            `${topic} - Mimari ve Veritabanı Şema Tasarımı`,
            `${topic} - Backend API ve İş Mantığı Geliştirmesi`,
            `${topic} - Frontend Arayüz ve State Entegrasyonu`,
            `${topic} - Uçtan Uca (E2E) Test ve Optimizasyon`
          ];

          if (genAI && process.env.GEMINI_API_KEY !== 'buraya_kendi_gemini_api_keyini_yapistir') {
            try {
              const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
              const result = await model.generateContent(
                `"${topic}" konusu için yazılım geliştirme sprintinde yapılacak 4 net teknik görevi her satırda bir görev olacak şekilde, başında numara veya tire olmadan sadece görev başlığı olarak yaz.`
              );
              const lines = result.response
                .text()
                .split('\n')
                .map((l) => l.replace(/^[-*0-9.)\s]+/, '').trim())
                .filter(Boolean)
                .slice(0, 4);
              if (lines.length >= 2) generatedTasks = lines;
            } catch (err) {
              console.error(err.message);
            }
          }

          for (const title of generatedTasks) {
            const created = await Task.create({
              room: data.room,
              title,
              status: 'todo',
              priority: 'high',
              assignee: data.sender,
              subtasks: [
                { title: 'Kodlamayı tamamla', completed: false },
                { title: 'PR incelemesinden geçir', completed: false }
              ]
            });
            io.to(data.room).emit('task_created', created);
          }

          const planMsg = await Message.create({
            room: data.room,
            sender: 'TeamSync AI',
            senderId: 'ai-bot',
            text:
              `🚀 "${topic}" için ${generatedTasks.length} adet sprint görevi otomatik oluşturuldu ve Kanban panosuna eklendi:\n` +
              generatedTasks.map((t) => `• ${t}`).join('\n'),
            isAi: true
          });

          io.to(data.room).emit('receive_message', planMsg);
        }
        return;
      }

      if (data.text.startsWith('/ai ')) {
        const prompt = data.text.replace('/ai ', '').trim();
        let aiReplyText = `🤖 [AI Analizi]: "${prompt}" konusu için önerilen teknik yaklaşım:\n${FENCE}javascript\nasync function executeWorkflow(payload) {\n  return { status: "optimized", target: "${prompt}" };\n}\n${FENCE}`;

        if (genAI && process.env.GEMINI_API_KEY !== 'buraya_kendi_gemini_api_keyini_yapistir') {
          try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(
              `Sen TeamSync AI adında teknik bir takım asistanısın. Kısa, net ve profesyonel yanıt ver: ${prompt}`
            );
            aiReplyText = result.response.text();
          } catch (aiErr) {
            aiReplyText = `AI Servis Hatası: ${aiErr.message}`;
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
      const newTask = await Task.create({
        room: data.room,
        title: data.title,
        status: 'todo',
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
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda calisiyor`));
