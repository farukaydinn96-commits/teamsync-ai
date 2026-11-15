import express from 'express';
import {
  getMessagesByRoom,
  getTasksByRoom,
  getDocByRoom
} from '../controllers/workspaceController.js';
import { signDemoToken } from '../middleware/workspaceGuard.js';

const router = express.Router();

router.post('/auth/demo-token', (req, res) => {
  const rawUser = String(req.body?.username || 'Faruk_Lead').trim().slice(0, 40);
  const role = rawUser === 'Faruk_Lead' ? 'Tech Lead' : 'Developer';
  const token = signDemoToken({ username: rawUser, role });
  res.json({ username: rawUser, role, token });
});

router.get('/messages/:room', getMessagesByRoom);
router.get('/tasks/:room', getTasksByRoom);
router.get('/docs/:room', getDocByRoom);

export default router;
