import mongoose from 'mongoose';

// ============================================
// Message Sub-Schema
// ============================================
// Simple flat array of messages for this specific branch.
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Conversation Schema (Chat-GPT Style Branches)
// ============================================
const conversationSchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The display name of the branch in the sidebar
    title: {
      type: String,
      required: true,
      default: 'New Chat',
      trim: true,
    },
    // ID of the conversation this branched from (null for Root Chat)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
      index: true,
    },
    // ID of the absolute root conversation for this tree
    rootId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    // Nesting depth for UI rendering (0 = root, 1 = first branch, etc)
    depth: {
      type: Number,
      required: true,
      default: 0,
    },
    // Flat array of messages in this isolated context
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for fetching the tree metadata quickly
conversationSchema.index({ paperId: 1, userId: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
