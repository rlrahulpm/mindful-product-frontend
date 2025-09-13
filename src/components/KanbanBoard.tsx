import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './KanbanBoard.css';

interface KanbanItem {
  id: number;
  title: string;
  description?: string;
  status: string;
  position: number;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  labels?: string;
  epicId?: string;
  storyPoints?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Product {
  productId: string;
  productName: string;
}

const KanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [kanbanItems, setKanbanItems] = useState<{ [key: string]: KanbanItem[] }>({
    COMMITTED: [],
    TODO: [],
    IN_PROGRESS: [],
    DONE: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KanbanItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  

  const columns = [
    { id: 'COMMITTED', title: 'Committed', color: '#64748b' },
    { id: 'TODO', title: 'To-Do', color: '#6366f1' },
    { id: 'IN_PROGRESS', title: 'In-Progress', color: '#f59e0b' },
    { id: 'DONE', title: 'Done', color: '#10b981' }
  ];

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    try {
      const response = await fetch(`http://localhost:8080/api/v3/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      }
    } catch (err) {
    }
  }, [productId]);

  const loadKanbanItems = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8080/api/v3/products/${productId}/kanban`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setKanbanItems({
          COMMITTED: data.COMMITTED || [],
          TODO: data.TODO || [],
          IN_PROGRESS: data.IN_PROGRESS || [],
          DONE: data.DONE || []
        });
      } else {
        setError('Failed to load kanban items');
      }
    } catch (err) {
      setError('Failed to load kanban items');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    
    const loadData = async () => {
      await Promise.all([loadProduct(), loadKanbanItems()]);
    };
    
    loadData();
  }, [productId, loadProduct, loadKanbanItems]);


  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const response = await fetch(`http://localhost:8080/api/v3/products/${productId}/kanban/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editingItem)
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setKanbanItems(prev => {
          const newItems = { ...prev };
          newItems[editingItem.status] = newItems[editingItem.status].map(item =>
            item.id === updatedItem.id ? updatedItem : item
          );
          return newItems;
        });
        setShowEditModal(false);
        setEditingItem(null);
        setSuccessMessage('Item updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Failed to update item');
      }
    } catch (err) {
      setError('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: number, status: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`http://localhost:8080/api/v3/products/${productId}/kanban/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setKanbanItems(prev => ({
          ...prev,
          [status]: prev[status].filter(item => item.id !== itemId)
        }));
        setSuccessMessage('Item deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Failed to delete item');
      }
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, item: KanbanItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(column);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string, targetPosition: number) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    const sourceColumn = draggedItem.status;
    
    // If dropping in the same position, do nothing
    if (sourceColumn === targetColumn && draggedItem.position === targetPosition) {
      setDraggedItem(null);
      setDraggedOverColumn(null);
      return;
    }

    // Check if this is a roadmap item (negative ID) or involves special columns
    const isRoadmapItem = draggedItem.id < 0;
    const involvesSpecialColumn = sourceColumn === 'COMMITTED' || targetColumn === 'COMMITTED' || sourceColumn === 'TODO' || targetColumn === 'TODO';
    
    // Only do optimistic updates for regular items not involving special columns
    if (!isRoadmapItem && !involvesSpecialColumn) {
      // Optimistically update UI for regular items
      const newKanbanItems = { ...kanbanItems };
      
      // Remove from source column
      newKanbanItems[sourceColumn] = newKanbanItems[sourceColumn].filter(
        item => item.id !== draggedItem.id
      );
      
      // Add to target column at position
      const updatedItem = { ...draggedItem, status: targetColumn, position: targetPosition };
      newKanbanItems[targetColumn].splice(targetPosition, 0, updatedItem);
      
      // Update positions
      newKanbanItems[targetColumn] = newKanbanItems[targetColumn].map((item, index) => ({
        ...item,
        position: index
      }));
      
      setKanbanItems(newKanbanItems);
    }

    // Make API call to persist the change
    try {
      const response = await fetch(`http://localhost:8080/api/v3/products/${productId}/kanban/${draggedItem.id}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: targetColumn,
          position: targetPosition
        })
      });

      if (!response.ok) {
        // Revert on failure
        loadKanbanItems();
        setError('Failed to move item');
      } else if (isRoadmapItem || involvesSpecialColumn) {
        // For roadmap items or moves involving special columns, reload to get correct state
        await loadKanbanItems();
      }
    } catch (err) {
      loadKanbanItems();
      setError('Failed to move item');
    }

    setDraggedItem(null);
    setDraggedOverColumn(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="kanban-container">
      {/* Header */}
      <div className="kanban-page-header">
        <div className="header-top-row">
          <div className="header-left">
            <button className="back-button" onClick={() => navigate(-1)}>
              <span className="material-icons">arrow_back</span>
            </button>
            <h1 className="kanban-page-title">
              <span className="material-icons">view_kanban</span>
              Kanban Board {product && `- ${product.productName}`}
            </h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="error-message">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}
      {successMessage && (
        <div className="success-message">
          <span className="material-icons">check_circle</span>
          {successMessage}
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div className="loading-state">
          <span className="material-icons">hourglass_empty</span>
          Loading kanban board...
        </div>
      ) : (
        <div className="kanban-board">
          {columns.map(column => (
            <div 
              key={column.id} 
              className={`kanban-column ${draggedOverColumn === column.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id, kanbanItems[column.id].length)}
            >
              <div className="column-header" style={{ borderTopColor: column.color }}>
                <h3>{column.title}</h3>
                <span className="item-count">{kanbanItems[column.id].length}</span>
              </div>
              <div className="column-content">
                {kanbanItems[column.id].map((item, index) => (
                  <div
                    key={item.id}
                    className={`kanban-item ${item.id < 0 ? 'roadmap-item' : ''} status-${item.status?.toLowerCase().replace('_', '-')}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDrop={(e) => handleDrop(e, column.id, index)}
                  >
                    <div className="item-header">
                      <h4>
                        {item.id < 0 && <span className="material-icons roadmap-indicator">map</span>}
                        {item.title}
                      </h4>
                      <div className="item-actions">
                        {item.id > 0 && (
                          <>
                            <button 
                              className="btn-edit-item"
                              onClick={() => {
                                setEditingItem(item);
                                setShowEditModal(true);
                              }}
                            >
                              <span className="material-icons">edit</span>
                            </button>
                            <button 
                              className="btn-delete-item"
                              onClick={() => handleDeleteItem(item.id, item.status)}
                            >
                              <span className="material-icons">delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {item.storyPoints && (
                      <div className="item-meta">
                        <div className="item-meta-left">
                          <span className="item-points">
                            <span className="material-icons">stars</span>
                            {item.storyPoints}
                          </span>
                        </div>
                      </div>
                    )}
                    {(item.priority || item.assignee || item.dueDate) && (
                      <div className="item-bottom-meta">
                        <div className="item-bottom-left">
                          {item.priority && (
                            <span 
                              className="item-priority"
                              style={{ backgroundColor: getPriorityColor(item.priority) }}
                            >
                              {item.priority}
                            </span>
                          )}
                          {item.assignee && (
                            <span className="item-assignee">
                              <span className="material-icons">person</span>
                              {item.assignee}
                            </span>
                          )}
                        </div>
                        {item.dueDate && (
                          <span className="item-due-date">
                            <span className="material-icons">event</span>
                            {formatDate(item.dueDate)}
                          </span>
                        )}
                      </div>
                    )}
                    {item.labels && item.labels !== 'roadmap-item' && (
                      <div className="item-labels">
                        {item.labels.split(',').filter(label => label.trim() !== 'roadmap-item').map((label, idx) => (
                          <span key={idx} className="item-label">{label.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {kanbanItems[column.id].length === 0 && (
                  <div className="empty-column">
                    <span className="material-icons">inbox</span>
                    <p>No items</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div className="kanban-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="kanban-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="kanban-modal-header">
              <h2 className="kanban-modal-title">
                <span className="material-icons">edit</span>
                Edit Item
              </h2>
              <button className="kanban-modal-close-btn" onClick={() => setShowEditModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="kanban-modal-body">
              <div className="form-group">
                <label className="form-label">
                  <span className="material-icons">title</span>
                  Title *
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="Enter item title"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <span className="material-icons">description</span>
                  Description
                </label>
                <textarea
                  className="form-control"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span className="material-icons">priority_high</span>
                    Priority
                  </label>
                  <select
                    className="form-control"
                    value={editingItem.priority || 'MEDIUM'}
                    onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value })}
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <span className="material-icons">stars</span>
                    Story Points
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={editingItem.storyPoints || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, storyPoints: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <span className="material-icons">person</span>
                  Assignee
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editingItem.assignee || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, assignee: e.target.value })}
                  placeholder="Assign to"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <span className="material-icons">event</span>
                  Due Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={editingItem.dueDate ? editingItem.dueDate.split('T')[0] : ''}
                  onChange={(e) => setEditingItem({ ...editingItem, dueDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <span className="material-icons">label</span>
                  Labels (comma-separated)
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editingItem.labels || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, labels: e.target.value })}
                  placeholder="bug, feature, enhancement"
                />
                <div className="form-help-text">
                  Add multiple labels separated by commas
                </div>
              </div>
            </div>
            <div className="kanban-modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleUpdateItem}>
                <span className="material-icons">save</span>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;