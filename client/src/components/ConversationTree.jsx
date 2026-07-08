// ============================================
// Conversation Tree Component (Recursive UI)
// ============================================
// Renders the ChatGPT-style branching tree in the sidebar.
// Handles nesting, collapsing/expanding, renaming, and deleting.

import { useState, useMemo } from 'react';
import apiClient from '../api/client.js';

// ============================================
// Recursive TreeNode Component
// ============================================

function countDescendants(node) {
  let count = 0;
  if (node.children && node.children.length > 0) {
    count += node.children.length;
    node.children.forEach(child => {
      count += countDescendants(child);
    });
  }
  return count;
}

function ConversationTreeNode({
  node,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);

  const isActive = activeConversationId === node._id;
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    onSelectConversation(node._id);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    const descendantsCount = countDescendants(node);
    const cascade = descendantsCount > 0;
    
    const msg = cascade 
      ? `Are you sure you want to delete this chat and its ${descendantsCount} nested branch${descendantsCount > 1 ? 'es' : ''}?` 
      : 'Are you sure you want to delete this chat?';

    if (window.confirm(msg)) {
      onDeleteConversation(node._id, cascade);
    }
  };

  const startRename = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(node.title);
  };

  const saveRename = async () => {
    if (editTitle.trim() && editTitle !== node.title) {
      await onRenameConversation(node._id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveRename();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(node.title);
    }
  };

  return (
    <div className="tree-node-wrapper">
      <div 
        className={`tree-node ${isActive ? 'tree-node--active' : ''}`}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Arrow */}
        <div 
          className={`tree-node-arrow ${hasChildren ? '' : 'tree-node-arrow--hidden'}`}
          onClick={handleToggle}
        >
          {isExpanded ? '▼' : '▶'}
        </div>

        {/* Title or Edit Input */}
        <div className="tree-node-content" onDoubleClick={startRename}>
          {isEditing ? (
            <input 
              autoFocus
              className="tree-node-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={saveRename}
              onKeyDown={handleKeyDown}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="tree-node-title">{node.title}</span>
          )}
        </div>

        {/* Action Menu (Hover) */}
        {!isEditing && (
          <div className="tree-node-actions">
            <button onClick={startRename} title="Rename">✏️</button>
            <button onClick={handleDelete} title="Delete">🗑</button>
          </div>
        )}
      </div>

      {/* Render Children Recursively */}
      {isExpanded && hasChildren && (
        <div className="tree-node-children">
          {node.children.map(child => (
            <ConversationTreeNode
              key={child._id}
              node={child}
              activeConversationId={activeConversationId}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
              onRenameConversation={onRenameConversation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Tree Component
// ============================================
function ConversationTree({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
}) {
  
  // Build tree from flat list
  const tree = useMemo(() => {
    const map = {};
    const roots = [];

    // Initialize map
    conversations.forEach(c => {
      map[c._id] = { ...c, children: [] };
    });

    // Link parents and children
    conversations.forEach(c => {
      const node = map[c._id];
      if (c.parentId && map[c.parentId]) {
        map[c.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [conversations]);

  if (tree.length === 0) {
    return (
      <div className="sidebar-empty">
        <p className="sidebar-empty__text">No chats yet.</p>
        <p className="sidebar-empty__subtext">Start a new conversation.</p>
      </div>
    );
  }

  return (
    <div className="conversation-tree">
      {tree.map(rootNode => (
        <ConversationTreeNode
          key={rootNode._id}
          node={rootNode}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
          onRenameConversation={onRenameConversation}
        />
      ))}
    </div>
  );
}

export default ConversationTree;
