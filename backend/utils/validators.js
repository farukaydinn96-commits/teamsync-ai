import { z } from 'zod';

const ALLOWED_BASE_ROOMS = ['general', 'development', 'sprint-planning'];

export const roomSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((val) => {
    const parts = val.split(':');
    const base = parts.length === 2 ? parts[1] : parts[0];
    const sessionOk = parts.length === 1 || /^sess_[a-z0-9_]{3,24}$/i.test(parts[0]);
    return sessionOk && ALLOWED_BASE_ROOMS.includes(base);
  }, 'Invalid or unauthorized channel room identifier');

export const messagePayloadSchema = z.object({
  room: roomSchema,
  sender: z.string().trim().min(1).max(50),
  senderId: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(2000),
  replyTo: z
    .object({
      sender: z.string().trim().max(50),
      text: z.string().trim().max(500)
    })
    .nullable()
    .optional()
});

export const taskPayloadSchema = z.object({
  room: roomSchema,
  title: z.string().trim().min(2).max(140),
  status: z.enum(['todo', 'in-progress', 'done']).optional().default('todo'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  assignee: z.string().trim().min(1).max(50).optional().default('Unassigned'),
  subtasks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        completed: z.boolean().optional().default(false)
      })
    )
    .max(15)
    .optional()
    .default([])
});

export const docPayloadSchema = z.object({
  room: roomSchema,
  content: z.string().max(50000),
  version: z.number().int().nonnegative().optional()
});

export const normalizeTaskTitle = (title = '') =>
  String(title).trim().toLowerCase().replace(/\s+/g, ' ');
