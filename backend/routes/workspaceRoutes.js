import express from 'express';
import {
  getMessagesByRoom,
  getTasksByRoom,
  getDocByRoom
} from '../controllers/workspaceController.js';

const router = express.Router();

router.get('/messages/:room', getMessagesByRoom);
router.get('/tasks/:room', getTasksByRoom);
router.get('/docs/:room', getDocByRoom);

export default router;