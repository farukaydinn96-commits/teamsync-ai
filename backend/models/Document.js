import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    content: {
      type: String,
      default: '',
      maxlength: 50000
    },
    version: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true }
);

// 24-hour TTL index matching Message and Task schemas for isolated session cleanup
documentSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model('Document', documentSchema);
