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

export default mongoose.model('Document', documentSchema);
