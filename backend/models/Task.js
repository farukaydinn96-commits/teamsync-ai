import mongoose from 'mongoose';
import { normalizeTaskTitle } from '../utils/validators.js';

const taskSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 140
    },
    normalizedTitle: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
      default: 'todo'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    assignee: {
      type: String,
      default: 'Unassigned'
    },
    subtasks: [
      {
        title: { type: String, required: true, maxlength: 120 },
        completed: { type: Boolean, default: false }
      }
    ]
  },
  { timestamps: true }
);

taskSchema.pre('validate', function (next) {
  if (this.title) {
    this.normalizedTitle = normalizeTaskTitle(this.title);
  }
  next();
});

// Unique compound index prevents concurrent /plan duplicate tasks in the same room
taskSchema.index({ room: 1, normalizedTitle: 1 }, { unique: true });
taskSchema.index({ room: 1, createdAt: -1 });
taskSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model('Task', taskSchema);
