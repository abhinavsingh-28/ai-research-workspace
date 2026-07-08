import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { formatFileSize } from '../utils/formatFileSize.js';
import ConversationTree from './ConversationTree.jsx';
import apiClient from '../api/client.js';
import { Library, Trash2, ArrowLeft } from 'lucide-react';

function Sidebar({ 
  papers, 
  selectedPaperId, 
  onSelectPaper, 
  onDeletePaper, 
  onUploadClick,
  activeConversationId,
  onSelectConversation,
  onBackToPapers
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Conversation state for the selected paper
  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Fetch conversations when a paper is selected
  const fetchConversations = useCallback(async () => {
    if (!selectedPaperId) return;
    setIsLoadingConversations(true);
    try {
      const res = await apiClient.get(`/conversations/paper/${selectedPaperId}`);
      setConversations(res.data.conversations || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [selectedPaperId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // When the conversations list updates, check if the active conversation was deleted.
  // If it was, clear the active conversation.
  useEffect(() => {
    if (activeConversationId && conversations.length > 0) {
      const stillExists = conversations.some(c => c._id === activeConversationId);
      if (!stillExists) {
        onSelectConversation(null);
      }
    }
  }, [conversations, activeConversationId, onSelectConversation]);

  // If activeConversationId changes and we don't have it, fetch (e.g. branch created in ChatPanel)
  useEffect(() => {
    if (activeConversationId) {
      setConversations(prev => {
        if (!prev.some(c => c._id === activeConversationId)) {
          // It's a new branch not in our list, fetch it!
          fetchConversations();
        }
        return prev;
      });
    }
  }, [activeConversationId, fetchConversations]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeletePaper = (e, paperId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this paper?')) {
      onDeletePaper(paperId);
    }
  };

  const handleNewRootChat = async () => {
    try {
      const res = await apiClient.post(`/conversations/paper/${selectedPaperId}/root`);
      await fetchConversations();
      onSelectConversation(res.data.conversation._id);
    } catch (error) {
      console.error('Failed to create root chat:', error);
    }
  };

  const handleDeleteConversation = async (id, cascade) => {
    console.log('handleDeleteConversation called with:', { id, cascade, activeConversationId });
    try {
      await apiClient.delete(`/conversations/${id}?cascade=${cascade}`);
      console.log('Delete API call succeeded');
      // Automatically select the nearest valid conversation after deletion
      if (activeConversationId === id) {
        console.log('Deleted conversation was active');
        const deletedConvo = conversations.find(c => c._id === id);
        if (deletedConvo && deletedConvo.parentId) {
          console.log('Selecting parent convo:', deletedConvo.parentId);
          onSelectConversation(deletedConvo.parentId);
        } else {
          const fallback = conversations.find(c => c._id !== id && !c.parentId);
          console.log('Selecting fallback convo:', fallback ? fallback._id : null);
          onSelectConversation(fallback ? fallback._id : null);
        }
      } else {
        console.log('Deleted conversation was NOT active');
      }
      await fetchConversations();
      console.log('fetchConversations finished');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleRenameConversation = async (id, title) => {
    try {
      await apiClient.patch(`/conversations/${id}`, { title });
      fetchConversations();
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  // Render the Papers List view
  const renderPapersView = () => (
    <>
      <div className="sidebar-header">
        <h2 className="sidebar-title">AI Research</h2>
        <button className="btn-primary sidebar-upload-btn" onClick={onUploadClick}>
          + Upload Paper
        </button>
      </div>
      <div className="sidebar-papers">
        {papers.length === 0 ? (
          <div className="sidebar-empty">
            <Library size={48} className="sidebar-empty__icon" style={{ opacity: 0.5, marginBottom: '8px' }} />
            <p className="sidebar-empty__text">No papers yet</p>
            <p className="sidebar-empty__subtext">Upload your first research paper</p>
          </div>
        ) : (
          papers.map((paper) => (
            <div
              key={paper._id}
              className={`sidebar-paper-item ${selectedPaperId === paper._id ? 'sidebar-paper-item--active' : ''}`}
              onClick={() => onSelectPaper(paper)}
            >
              <div className="sidebar-paper-item__content">
                <p className="sidebar-paper-item__title">{paper.title}</p>
                <p className="sidebar-paper-item__meta">
                  {formatFileSize(paper.fileSize)} · {new Date(paper.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                className="sidebar-paper-item__delete"
                onClick={(e) => handleDeletePaper(e, paper._id)}
                title="Delete paper"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );

  // Render the Conversations Tree view
  const renderConversationsView = () => (
    <>
      <div className="sidebar-header">
        <button className="btn-ghost sidebar-back-btn" onClick={onBackToPapers}>
          <ArrowLeft size={16} /> Back to Papers
        </button>
        <button className="btn-primary sidebar-upload-btn" onClick={handleNewRootChat}>
          + New Root Chat
        </button>
      </div>
      <div className="sidebar-tree-container">
        {isLoadingConversations ? (
          <div className="sidebar-empty">
            <p className="sidebar-empty__text">Loading chats...</p>
          </div>
        ) : (
          <ConversationTree
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={onSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
          />
        )}
      </div>
    </>
  );

  return (
    <aside className="app-sidebar">
      {selectedPaperId ? renderConversationsView() : renderPapersView()}

      {/* ---- User Info + Logout ---- */}
      <div className="sidebar-footer">
        <p className="sidebar-footer__label">Signed in as</p>
        <p className="sidebar-footer__name">{user?.name}</p>
        <button
          className="btn-ghost sidebar-logout-btn"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
