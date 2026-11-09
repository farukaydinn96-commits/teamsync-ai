import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    isAi: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    reactions: {
      type: Map,
      of: Number,
      default: {},
    },
    replyTo: {
      sender: String,
      text: String,
    },
    poll: {
      question: String,
      options: [
        {
          text: String,
          votes: { type: Number, default: 0 },
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Message', messageSchema);