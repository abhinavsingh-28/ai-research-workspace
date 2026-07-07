// ============================================
// Conversation Routes — Branched Chat API
// ============================================
// These routes manage tree-structured conversations for papers.
//
// GET  /api/conversations/:paperId            → Get or create conversation
// POST /api/conversations/:paperId/message     → Add a message (with branching)
// GET  /api/conversations/:paperId/branch/:id  → Get the path from root to a message

import express from 'express';
import auth from '../middleware/auth.js';
import Conversation from '../models/Conversation.js';
import Paper from '../models/Paper.js';

const router = express.Router();

// ============================================
// Helper: Get Branch Path
// ============================================
// Given a conversation and a messageId, walk UP the tree
// from that message to the root, collecting all ancestors.
// Returns messages in root → leaf order.
//
// This is the core of "context isolation" — we only return
// messages on the direct path, ignoring other branches.
function getBranchPath(conversation, messageId) {
  const messagesMap = new Map();
  for (const msg of conversation.messages) {
    messagesMap.set(msg._id.toString(), msg);
  }

  const path = [];
  let currentId = messageId;

  // Walk up the tree until we hit a root message (parentId = null)
  while (currentId) {
    const msg = messagesMap.get(currentId.toString());
    if (!msg) break;
    path.unshift(msg); // Add to the FRONT (we're walking backwards)
    currentId = msg.parentId;
  }

  return path;
}

// ============================================
// GET /:paperId — Get or Create Conversation
// ============================================
// Returns the full conversation tree for a paper.
// Creates an empty conversation if one doesn't exist yet.
router.get('/:paperId', auth, async (req, res) => {
  try {
    // Verify the paper belongs to the user
    const paper = await Paper.findById(req.params.paperId);
    if (!paper) return res.status(404).json({ message: 'Paper not found.' });
    if (paper.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    // findOne or create — get existing conversation or make a new one
    let conversation = await Conversation.findOne({
      paperId: req.params.paperId,
      userId: req.user.userId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        paperId: req.params.paperId,
        userId: req.user.userId,
        messages: [],
      });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error.message);
    res.status(500).json({ message: 'Server error fetching conversation.' });
  }
});

// ============================================
// POST /:paperId/message — Add a Message
// ============================================
// Adds a user message to the conversation tree.
// Then calls the ML service to get an AI response,
// passing the full branch context for accurate answers.
//
// Body: { content, parentId }
//   content  — the user's question
//   parentId — the _id of the message to branch from (null for new root thread)
router.post('/:paperId/message', auth, async (req, res) => {
  try {
    const { content, parentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    // Verify paper ownership
    const paper = await Paper.findById(req.params.paperId);
    if (!paper) return res.status(404).json({ message: 'Paper not found.' });
    if (paper.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    // Get or create conversation
    let conversation = await Conversation.findOne({
      paperId: req.params.paperId,
      userId: req.user.userId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        paperId: req.params.paperId,
        userId: req.user.userId,
        messages: [],
      });
    }

    // Add the user's message to the tree
    conversation.messages.push({
      role: 'user',
      content: content.trim(),
      parentId: parentId || null,
    });

    await conversation.save();

    // The new user message is the last one in the array
    const userMsg = conversation.messages[conversation.messages.length - 1];

    // Get the full branch path (root → this message) for context
    const branchPath = getBranchPath(conversation, userMsg._id.toString());

    // Build conversation history for the ML service
    const conversationHistory = branchPath
      .slice(0, -1) // Exclude the current message (it's the question)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    // Call the ML service with branch context
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const mlResponse = await fetch(`${mlServiceUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: req.params.paperId,
        question: content.trim(),
        conversationHistory,
      }),
    });

    if (!mlResponse.ok) {
      const errorData = await mlResponse.json().catch(() => ({}));
      console.error('ML service error:', errorData);
      return res.status(502).json({
        message: 'AI service is unavailable.',
      });
    }

    const data = await mlResponse.json();

    // Add the AI's response as a child of the user's message
    conversation.messages.push({
      role: 'assistant',
      content: data.answer,
      parentId: userMsg._id,
    });

    await conversation.save();

    const assistantMsg = conversation.messages[conversation.messages.length - 1];

    res.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      answer: data.answer,
    });
  } catch (error) {
    console.error('Add message error:', error.message);
    res.status(500).json({ message: 'Server error adding message.' });
  }
});

// ============================================
// GET /:paperId/branch/:messageId — Get Branch Path
// ============================================
// Returns the linear path from root to the specified message.
// Used by the frontend to display a specific branch.
router.get('/:paperId/branch/:messageId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      paperId: req.params.paperId,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const path = getBranchPath(conversation, req.params.messageId);

    res.json({ messages: path });
  } catch (error) {
    console.error('Get branch error:', error.message);
    res.status(500).json({ message: 'Server error fetching branch.' });
  }
});

export default router;
