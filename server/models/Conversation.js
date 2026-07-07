// ============================================
// Conversation Model — Tree-Structured Chat
// ============================================
// This model stores conversations about papers as a TREE, not a flat list.
// Each message has a parentId pointing to the message it responds to.
// This enables "branching" — exploring different lines of questioning
// from the same point in a conversation.
//
// CONCEPT: Embedded Documents vs. Referenced Documents
//
// In MongoDB, you can model relationships two ways:
//   1. Embedded: Store the related data INSIDE the parent document.
//      → messages[] lives inside the Conversation document.
//      → Fast reads (one query gets everything).
//      → Good when the child data is always accessed with the parent.
//
//   2. Referenced: Store related data in separate collections with ObjectId links.
//      → Like SQL foreign keys.
//      → Better for very large or independently accessed data.
//
// We use EMBEDDED documents here because:
//   - Messages are always fetched alongside their conversation.
//   - A single paper's conversation won't exceed MongoDB's 16MB document limit.
//   - Tree traversal (finding a branch path) is faster in-memory than across collections.
//
// CONCEPT: Tree Traversal via parentId
//
// To get the full context for a branch, we walk UP the tree:
//   1. Start at the current message
//   2. Find its parent (by parentId)
//   3. Find the parent's parent
//   4. Repeat until parentId is null (root)
//   5. Reverse the list to get root → current order
//
// This gives us ONLY the messages relevant to this branch,
// not unrelated branches — that's "context isolation."

import mongoose from 'mongoose';

// ============================================
// Message Sub-Schema
// ============================================
// Each message is an embedded subdocument inside a Conversation.
// Mongoose automatically generates an _id for each subdocument.

const messageSchema = new mongoose.Schema(
  {
    // The role: 'user' (question) or 'assistant' (AI response)
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },

    // The actual text content of the message
    content: {
      type: String,
      required: true,
    },

    // parentId: the _id of the parent message in the tree.
    // null means this is a ROOT message (first question in a thread).
    //
    // Example tree:
    //   msg1 (parentId: null)    ← "What is this paper about?"
    //   msg2 (parentId: msg1)    ← AI response
    //   msg3 (parentId: msg2)    ← "Explain attention" (Branch 1)
    //   msg5 (parentId: msg2)    ← "Key results?" (Branch 2)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Conversation Schema
// ============================================
const conversationSchema = new mongoose.Schema(
  {
    // Which paper this conversation belongs to
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },

    // Which user owns this conversation
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // The tree of messages — stored as an embedded array.
    // Each message has a parentId linking it to its parent in the tree.
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index: quickly find the conversation for a specific paper+user combo
conversationSchema.index({ paperId: 1, userId: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
