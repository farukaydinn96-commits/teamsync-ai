import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import workspaceRoutes from './routes/workspaceRoutes.js';
import { seedInitialData } from './controllers/workspaceController.js';
import { registerWorkspaceSockets } from './sockets/workspaceSocket.js';
import { notFoundHandler, errorHandler, logEvent } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Required behind Render reverse proxy so req.ip & rate limiting track real visitor IPs
app.set('trust proxy', 1);

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
  return callback(new Error('Origin not allowed by CORS'));
};

app.use(helmet());
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true
  })
);
app.use(express.json({ limit: '10kb' }));

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
app.use(notFoundHandler);
app.use(errorHandler);

const io = new Server(server, {
  maxHttpBufferSize: 50 * 1024,
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
      logEvent('info', 'MongoDB Atlas connected');
      await seedInitialData();
    })
    .catch((err) => logEvent('warn', 'MongoDB connection warning', { error: err.message }));
}

const genAI =
  process.env.GEMINI_API_KEY &&
  process.env.GEMINI_API_KEY !== 'buraya_kendi_gemini_api_keyini_yapistir'
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

registerWorkspaceSockets(io, genAI);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => logEvent('info', `TeamSync AI Server listening on port ${PORT}`));
