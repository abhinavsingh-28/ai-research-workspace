import express from 'express';
import auth from '../middleware/auth.js';
import Conversation from '../models/Conversation.js';
import Paper from '../models/Paper.js';

const router = express.Router();

// ============================================
// Helper: Verify Paper Ownership
// ============================================
async function verifyPaper(paperId, userId) {
  const paper = await Paper.findById(paperId);
  if (!paper) throw new Error('Paper not found');
  if (paper.userId.toString() !== userId) throw new Error('Not authorized');
  return paper;
}

// ============================================
// GET /paper/:paperId
// Get all conversation metadata (tree) for a paper
// ============================================
router.get('/paper/:paperId', auth, async (req, res) => {
  try {
    await verifyPaper(req.params.paperId, req.user.userId);

    // Fetch all conversations for this paper, EXCLUDING the heavy messages array
    // We only need the metadata to render the sidebar tree.
    const conversations = await Conversation.find(
      { paperId: req.params.paperId, userId: req.user.userId },
      { messages: 0 } // Exclude messages for faster loading
    ).sort({ createdAt: 1 });

    res.json({ conversations });
  } catch (error) {
    console.error('Fetch tree error:', error.message);
    res.status(error.message === 'Not authorized' ? 403 : 500).json({ message: error.message });
  }
});

// ============================================
// GET /:id
// Get a specific conversation (including messages)
// ============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    
    res.json({ conversation });
  } catch (error) {
    console.error('Fetch conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// POST /paper/:paperId/root
// Create a new root conversation
// ============================================
router.post('/paper/:paperId/root', auth, async (req, res) => {
  try {
    await verifyPaper(req.params.paperId, req.user.userId);

    const newRoot = new Conversation({
      paperId: req.params.paperId,
      userId: req.user.userId,
      title: 'Root Chat',
      parentId: null,
      depth: 0,
      messages: [],
    });
    
    // rootId must point to itself since it's the root
    newRoot.rootId = newRoot._id;
    await newRoot.save();

    res.json({ conversation: newRoot });
  } catch (error) {
    console.error('Create root error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// POST /:id/branch
// Branch off from a specific message index
// ============================================
router.post('/:id/branch', auth, async (req, res) => {
  try {
    const { messageIndex } = req.body;
    
    const parentConv = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!parentConv) return res.status(404).json({ message: 'Parent conversation not found' });
    if (messageIndex < 0 || messageIndex >= parentConv.messages.length) {
      return res.status(400).json({ message: 'Invalid message index' });
    }

    // Copy messages from 0 to messageIndex (inclusive) and hide them in the UI
    const inheritedMessages = parentConv.messages.slice(0, messageIndex + 1).map(msg => ({
      role: msg.role,
      content: msg.content,
      isHidden: true
    }));

    const newBranch = new Conversation({
      paperId: parentConv.paperId,
      userId: req.user.userId,
      title: 'New Branch',
      parentId: parentConv._id,
      rootId: parentConv.rootId,
      depth: parentConv.depth + 1,
      messages: inheritedMessages,
    });

    await newBranch.save();

    res.json({ conversation: newBranch });
  } catch (error) {
    console.error('Branch error:', error);
    res.status(500).json({ message: 'Server error branching' });
  }
});

// ============================================
// POST /:id/message
// Add a message and get AI response
// ============================================
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Content required' });

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    // 1. Add User Message
    conversation.messages.push({ role: 'user', content: content.trim() });
    await conversation.save();

    const userMsg = conversation.messages[conversation.messages.length - 1];

    // 2. Format history for ML service
    // Exclude the last message (which is the current user question)
    const history = conversation.messages.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 3. Call ML Service
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const mlResponse = await fetch(`${mlServiceUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: conversation.paperId.toString(),
        question: content.trim(),
        conversationHistory: history,
      }),
    });

    if (!mlResponse.ok) throw new Error('AI service error');
    
    const mlData = await mlResponse.json();

    // 4. Add AI Message
    conversation.messages.push({ role: 'assistant', content: mlData.answer });
    
    // Auto-generate title if this is the first real exchange and title is default
    if (conversation.title === 'Root Chat' || conversation.title === 'New Branch') {
      if (conversation.messages.length <= 4) { // keep it simple
        // Use first few words of the user question as title
        const shortTitle = content.split(' ').slice(0, 4).join(' ') + '...';
        conversation.title = shortTitle;
      }
    }

    await conversation.save();
    
    const assistantMsg = conversation.messages[conversation.messages.length - 1];

    res.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      title: conversation.title // In case it auto-updated
    });
  } catch (error) {
    console.error('Message error:', error);
    res.status(500).json({ message: 'Server error processing message' });
  }
});

// ============================================
// PATCH /:id (Rename)
// ============================================
router.patch('/:id', auth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { title: title.trim() },
      { new: true }
    );

    if (!conversation) return res.status(404).json({ message: 'Not found' });
    res.json({ title: conversation.title });
  } catch (error) {
    res.status(500).json({ message: 'Error renaming conversation' });
  }
});

// ============================================
// DELETE /:id
// Delete a conversation (and optionally descendants)
// ============================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const { cascade } = req.query;
    
    // Verify ownership
    const target = await Conversation.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!target) return res.status(404).json({ message: 'Not found' });

    if (cascade === 'true') {
      // Find all descendants recursively. 
      // Because we store parentId but not an ancestors array, getting ALL descendants 
      // in one query is tricky in Mongo without $graphLookup. 
      // A simpler heuristic for this scale: since they share rootId, we can just fetch all 
      // for this rootId, build the tree in memory, find descendants, and delete them.
      
      const allTreeNodes = await Conversation.find({ rootId: target.rootId, userId: req.user.userId });
      
      const idsToDelete = new Set([target._id.toString()]);
      
      // Keep running through the list adding children of things we are deleting
      // until the set stops growing.
      let added = true;
      while (added) {
        added = false;
        for (const node of allTreeNodes) {
          if (node.parentId && idsToDelete.has(node.parentId.toString()) && !idsToDelete.has(node._id.toString())) {
            idsToDelete.add(node._id.toString());
            added = true;
          }
        }
      }

      await Conversation.deleteMany({ _id: { $in: Array.from(idsToDelete) } });
      res.json({ message: 'Deleted with descendants', deletedCount: idsToDelete.size });
    } else {
      // Delete just this one
      await Conversation.deleteOne({ _id: target._id });
      res.json({ message: 'Deleted' });
    }

  } catch (error) {
    res.status(500).json({ message: 'Error deleting conversation' });
  }
});

export default router;
