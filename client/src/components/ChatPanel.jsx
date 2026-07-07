// ============================================
// ChatPanel — AI Chat Interface Component
// ============================================
// This component provides a chat-style UI for asking questions
// about the currently selected paper.
//
// It displays:
//   - A scrollable list of messages (user questions + AI answers)
//   - An input box at the bottom for typing questions
//   - A loading indicator while the AI is thinking
//
// Props:
//   paperId — the MongoDB _id of the selected paper (needed for the API call)

import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client';

function ChatPanel({ paperId }) {
  // ============================================
  // State
  // ============================================
  // messages: array of { role: 'user' | 'assistant', content: string }
  // input: the current text in the input box
  // loading: true while waiting for the AI response
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Ref to auto-scroll to the latest message
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear messages when a different paper is selected
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [paperId]);

  // ============================================
  // Send a Question
  // ============================================
  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    // Add the user's message to the chat immediately
    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // POST to our Node.js proxy route
      // Note: apiClient.baseURL already includes '/api', so we just use '/papers/...'
      const res = await apiClient.post(`/papers/${paperId}/chat`, {
        question,
      });

      // Add the AI's response to the chat
      const assistantMessage = {
        role: 'assistant',
        content: res.data.answer,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Show an error message in the chat
      const errorMessage = {
        role: 'assistant',
        content: error.response?.data?.message || 'Failed to get a response. Make sure the ML service is running.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Allow sending with Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <span className="chat-panel-icon">💬</span>
        <h3>Ask about this paper</h3>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <p className="chat-empty-icon">🤖</p>
            <p>Ask me anything about this paper!</p>
            <p className="chat-hint">Try: "What is this paper about?" or "Summarize the key findings"</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
          >
            <div className="chat-message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="chat-message-content">
              {msg.content}
            </div>
          </div>
        ))}

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
          placeholder="Ask a question about this paper..."
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
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}

export default ChatPanel;
