// ============================================
// ChatPanel — Recursive Threaded View
// ============================================
// This component displays conversational branches simultaneously as a tree.
// Users can see multiple branches at once and reply inline to any message.

import { useState, useRef, useEffect, useMemo } from 'react';
import apiClient from '../api/client';

// ============================================
// Helper: Build Tree
// ============================================
// Converts a flat array of messages (where each has a parentId)
// into a nested tree structure (where each has a children[] array).
function buildMessageTree(messages) {
  const messageMap = {};
  const roots = [];

  // Initialize map and children arrays
  messages.forEach(msg => {
    messageMap[msg._id] = { ...msg, children: [] };
  });

  // Link children to parents
  messages.forEach(msg => {
    const node = messageMap[msg._id];
    if (msg.parentId && messageMap[msg.parentId]) {
      messageMap[msg.parentId].children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// ============================================
// Recursive Message Node Component
// ============================================
function ChatMessageNode({ node, replyingToId, setReplyingToId, onSendReply }) {
  const [inlineInput, setInlineInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReplying = replyingToId === node._id;

  const handleInlineSubmit = async () => {
    if (!inlineInput.trim()) return;
    setIsSubmitting(true);
    await onSendReply(inlineInput, node._id);
    setInlineInput('');
    setIsSubmitting(false);
    setReplyingToId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInlineSubmit();
    }
  };

  return (
    <div className="chat-thread-node">
      {/* The Message Itself */}
      <div className={`chat-message ${node.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
        <div className="chat-message-avatar">
          {node.role === 'user' ? '👤' : '🤖'}
        </div>
        <div className="chat-message-content">
          {node.content}
          
          {/* Action buttons (only AI responses can be branched from) */}
          {node.role === 'assistant' && node._id !== 'temp-error' && !node._id.startsWith('temp-') && (
            <div className="chat-message-actions">
              <button 
                className="branch-btn"
                onClick={() => setReplyingToId(isReplying ? null : node._id)}
                title="Start a new conversation branch from this message"
              >
                {isReplying ? 'Cancel' : '⑂ Branch from here'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline Reply Box (if active) */}
      {isReplying && (
        <div className="chat-inline-reply">
          <input
            autoFocus
            type="text"
            className="chat-input"
            placeholder="Ask a follow-up question..."
            value={inlineInput}
            onChange={(e) => setInlineInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <button
            className="chat-send-btn"
            onClick={handleInlineSubmit}
            disabled={isSubmitting || !inlineInput.trim()}
          >
            {isSubmitting ? '⏳' : '➤'}
          </button>
        </div>
      )}

      {/* Render Children Recursively */}
      {node.children && node.children.length > 0 && (
        <div className="chat-thread-children">
          {node.children.map(child => (
            <ChatMessageNode
              key={child._id}
              node={child}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              onSendReply={onSendReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main ChatPanel Component
// ============================================
function ChatPanel({ paperId }) {
  const [messages, setMessages] = useState([]);
  const [rootInput, setRootInput] = useState('');
  const [loadingRoot, setLoadingRoot] = useState(false);
  
  // Tracks which message ID currently has the inline reply box open
  const [replyingToId, setReplyingToId] = useState(null);

  const messagesEndRef = useRef(null);

  // Auto-scroll logic (scroll to bottom only when new root messages are added)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Fetch Conversation
  useEffect(() => {
    if (!paperId) return;

    const fetchConversation = async () => {
      try {
        const res = await apiClient.get(`/conversations/${paperId}`);
        setMessages(res.data.conversation.messages || []);
        setReplyingToId(null);
      } catch (error) {
        console.error('Failed to load conversation:', error);
      }
    };

    fetchConversation();
  }, [paperId]);

  // Transform flat array into tree structure
  const messageTree = useMemo(() => buildMessageTree(messages), [messages]);

  // Send a message (either root or a branch)
  const handleSendMessage = async (content, parentId = null) => {
    const question = content.trim();
    if (!question) return;

    const tempId = 'temp-' + Date.now();
    const tempUserMsg = { _id: tempId, role: 'user', content: question, parentId };
    
    // Optimistic UI update
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await apiClient.post(`/conversations/${paperId}/message`, {
        content: question,
        parentId: parentId,
      });

      const { userMessage, assistantMessage } = res.data;

      // Replace temp message with real ones
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m._id !== tempId);
        return [...withoutTemp, userMessage, assistantMessage];
      });

    } catch (error) {
      const tempErrorMsg = {
        _id: 'temp-error-' + Date.now(),
        role: 'assistant',
        content: error.response?.data?.message || 'Failed to get a response.',
        parentId: tempId // Attach error to the optimistic user message so it shows up
      };
      setMessages(prev => [...prev, tempErrorMsg]);
    }
  };

  // Submit handler for the global input (starts a new root thread)
  const handleRootSubmit = async () => {
    if (!rootInput.trim() || loadingRoot) return;
    setLoadingRoot(true);
    await handleSendMessage(rootInput, null);
    setRootInput('');
    setLoadingRoot(false);
  };

  const handleRootKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRootSubmit();
    }
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <span className="chat-panel-icon">💬</span>
        <h3>Ask about this paper</h3>
      </div>

      {/* Messages Area (Threaded View) */}
      <div className="chat-messages">
        {messageTree.length === 0 && (
          <div className="chat-empty-state">
            <p className="chat-empty-icon">🤖</p>
            <p>Ask me anything about this paper!</p>
            <p className="chat-hint">Try: "What is this paper about?"</p>
          </div>
        )}

        {messageTree.map(rootNode => (
          <ChatMessageNode
            key={rootNode._id}
            node={rootNode}
            replyingToId={replyingToId}
            setReplyingToId={setReplyingToId}
            onSendReply={handleSendMessage}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Global Input Area (for starting completely new threads) */}
      <div className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Start a new independent topic..."
          value={rootInput}
          onChange={(e) => setRootInput(e.target.value)}
          onKeyDown={handleRootKeyDown}
          disabled={loadingRoot}
        />
        <button
          className="chat-send-btn"
          onClick={handleRootSubmit}
          disabled={loadingRoot || !rootInput.trim()}
        >
          {loadingRoot ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}

export default ChatPanel;
