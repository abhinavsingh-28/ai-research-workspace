// ============================================
// ChatPanel — Isolated Flat Conversation UI
// ============================================
// This component displays a single conversation branch linearly.
// All branching logic is handled via the "Open in Branch" button,
// which creates a new isolated conversation and switches to it.

import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client.js';
import { User, Bot, GitBranch, MessageSquareDashed, MessageCircle, Loader2, Send } from 'lucide-react';

function ChatPanel({ paperId, activeConversationId, onConversationChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBranching, setIsBranching] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Fetch the active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const fetchConversation = async () => {
      try {
        const res = await apiClient.get(`/conversations/${activeConversationId}`);
        if (isMounted) {
          setMessages(res.data.conversation.messages || []);
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
      }
    };

    fetchConversation();
    return () => { isMounted = false; };
  }, [activeConversationId]);

  // Handle sending a new message
  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading || !activeConversationId) return;

    // Optimistic UI
    const tempId = 'temp-' + Date.now();
    setMessages(prev => [...prev, { _id: tempId, role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post(`/conversations/${activeConversationId}/message`, {
        content: question
      });

      const { userMessage, assistantMessage } = res.data;

      // Replace temp with real
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m._id !== tempId);
        return [...withoutTemp, userMessage, assistantMessage];
      });
    } catch (error) {
      setMessages(prev => [...prev, {
        _id: 'temp-err-' + Date.now(),
        role: 'assistant',
        content: error.response?.data?.message || 'Failed to get a response.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Branching action
  const handleBranch = async (index) => {
    if (isBranching || !activeConversationId) return;
    setIsBranching(true);
    
    try {
      const res = await apiClient.post(`/conversations/${activeConversationId}/branch`, {
        messageIndex: index
      });
      // Switch to the newly created branch
      onConversationChange(res.data.conversation._id);
    } catch (error) {
      console.error('Failed to branch:', error);
      alert('Failed to branch conversation. Please try again.');
    } finally {
      setIsBranching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty State: No active conversation selected
  if (!activeConversationId) {
    return (
      <div className="chat-panel">
        <div className="chat-empty-state">
          <MessageSquareDashed size={48} className="chat-empty-icon" style={{ opacity: 0.5, marginBottom: '8px' }} />
          <p>Select a chat from the sidebar</p>
          <p className="chat-hint">Or click "+ New Root Chat" to start a new discussion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <MessageCircle size={18} className="chat-panel-icon" />
        <h3>Conversation</h3>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <Bot size={48} className="chat-empty-icon" />
            <p>Ask me anything about this paper!</p>
          </div>
        )}

        {messages.map((msg, index) => {
          if (msg.isHidden) return null;
          return (
            <div
              key={msg._id || index}
              className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
            >
              <div className="chat-message-avatar">
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className="chat-message-content">
                {msg.content}
                
                {/* Branch Button (only on AI responses) */}
                {msg.role === 'assistant' && !msg._id?.startsWith('temp-err') && (
                  <div className="chat-message-actions">
                    <button 
                      className="branch-btn"
                      onClick={() => handleBranch(index)}
                      disabled={isBranching}
                      title="Open this context in a new independent branch"
                    >
                      <GitBranch size={14} /> Branch
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {loading && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-message-avatar">🤖</div>
            <div className="chat-message-content chat-loading">
              <span className="dot-pulse"></span>
              Thinking...
            </div>
          </div>
        )}

        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

export default ChatPanel;
