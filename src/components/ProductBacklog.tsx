import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProduct';
import './ProductBacklog.css';

interface ProductBacklogData {
  id?: number;
  productId: number;
  epics: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Epic {
  id: string;
  name: string;
  description: string;
  themeId: string;
  themeName: string;
  themeColor: string;
  initiativeId: string;
  initiativeName: string;
  track: string;
}

interface Theme {
  id: string;
  name: string;
  color: string;
}

interface Initiative {
  id: string;
  title: string;
}

const ProductBacklog: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { product, loading: productLoading, error: productError } = useProduct(productSlug);
  const editorRef = useRef<HTMLDivElement>(null);
  const editViewEditorRef = useRef<HTMLDivElement>(null);
  const [showAddEpicModal, setShowAddEpicModal] = useState(false);
  const [newEpic, setNewEpic] = useState<Epic>({
    id: '',
    name: '',
    description: '',
    themeId: '',
    themeName: '',
    themeColor: '',
    initiativeId: '',
    initiativeName: '',
    track: 'Customer Concerns'
  });
  const [productBacklog, setProductBacklog] = useState<ProductBacklogData>({
    productId: 0,
    epics: ''
  });
  
  const [epics, setEpics] = useState<Epic[]>([]);
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  const [availableInitiatives, setAvailableInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [viewingEpic, setViewingEpic] = useState<Epic | null>(null);
  const [showViewEpicModal, setShowViewEpicModal] = useState(false);
  const [isEditingInViewModal, setIsEditingInViewModal] = useState(false);
  const [editingViewEpic, setEditingViewEpic] = useState<Epic | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('');
  const [selectedInitiativeFilter, setSelectedInitiativeFilter] = useState('');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState('');
  const [deletingEpicId, setDeletingEpicId] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [epicToDelete, setEpicToDelete] = useState<Epic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteRequestRef = useRef<Set<string>>(new Set());

  // Filtered epics based on search and filters
  const filteredEpics = useMemo(() => {
    return epics.filter(epic => {
      const matchesSearch = searchTerm === '' || 
        epic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        epic.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTheme = selectedThemeFilter === '' || epic.themeId === selectedThemeFilter;
      const matchesInitiative = selectedInitiativeFilter === '' || epic.initiativeId === selectedInitiativeFilter;
      const matchesTrack = selectedTrackFilter === '' || epic.track === selectedTrackFilter;
      
      return matchesSearch && matchesTheme && matchesInitiative && matchesTrack;
    });
  }, [epics, searchTerm, selectedThemeFilter, selectedInitiativeFilter, selectedTrackFilter]);

  // Clear filters function
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedThemeFilter('');
    setSelectedInitiativeFilter('');
    setSelectedTrackFilter('');
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (product && product.productId) {
      loadProductAndBacklog();
      setProductBacklog(prev => ({ ...prev, productId: product.productId }));
    }
  }, [product]);


  // Initialize editor content when modal opens
  useEffect(() => {
    if (showAddEpicModal && editorRef.current) {
      // Only set content if editor is empty and newEpic has description
      if (!editorRef.current.innerHTML && newEpic.description) {
        editorRef.current.innerHTML = newEpic.description;
      }
    }
  }, [showAddEpicModal, newEpic.description]);

  // Initialize edit view editor content when entering edit mode
  useEffect(() => {
    if (isEditingInViewModal && editViewEditorRef.current && editingViewEpic) {
      // Only set content when first entering edit mode, not on every state change
      if (!editViewEditorRef.current.innerHTML || editViewEditorRef.current.innerHTML === '') {
        editViewEditorRef.current.innerHTML = editingViewEpic.description || '';
      }
    }
  }, [isEditingInViewModal]);

  const loadProductAndBacklog = async () => {
    if (!product?.productId) return;
    
    try {
      setLoading(true);
      
      const [backlogData, hypothesisData] = await Promise.all([
        loadProductBacklogData(product.productId),
        loadProductHypothesisData(product.productId)
      ]);
      
      // Load themes and initiatives from hypothesis data
      if (hypothesisData) {
        if (hypothesisData.themes) {
          try {
            const parsedThemes = JSON.parse(hypothesisData.themes);
            if (Array.isArray(parsedThemes)) {
              setAvailableThemes(parsedThemes);
            }
          } catch (e) {
          }
        }
        
        if (hypothesisData.initiatives) {
          try {
            const parsedInitiatives = JSON.parse(hypothesisData.initiatives);
            if (Array.isArray(parsedInitiatives)) {
              setAvailableInitiatives(parsedInitiatives);
            }
          } catch (e) {
          }
        }
      }
      
      if (backlogData) {
        setProductBacklog(backlogData);
        
        // Parse epics
        if (backlogData.epics) {
          try {
            const parsedEpics = JSON.parse(backlogData.epics);
            if (Array.isArray(parsedEpics)) {
              setEpics(parsedEpics);
            }
          } catch (e) {
          }
        }
      }
    } catch (err: any) {
      setError('Failed to load product backlog data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProductBacklogData = async (productId: number): Promise<ProductBacklogData | null> => {
    try {
      const response = await fetch(`http://localhost:8080/api/v3/products/${productId}/backlog`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        return null;
      } else {
        throw new Error('Failed to load product backlog data');
      }
    } catch (error) {
      return null;
    }
  };

  const loadProductHypothesisData = async (productId: number) => {
    try {
      const response = await fetch(`http://localhost:8080/api/products/${productId}/hypothesis`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  // Epic management
  const openAddEpicModal = useCallback(() => {
    setNewEpic({
      id: Date.now().toString(),
      name: '',
      description: '',
      themeId: '',
      themeName: '',
      themeColor: '',
      initiativeId: '',
      initiativeName: '',
      track: 'Customer Concerns'
    });
    setShowAddEpicModal(true);
  }, []);

  const closeAddEpicModal = useCallback(() => {
    setShowAddEpicModal(false);
    setSaving(false); // Reset saving state
    setError(''); // Clear any errors
    
    // Reset epic form
    setNewEpic({
      id: '',
      name: '',
      description: '',
      themeId: '',
      themeName: '',
      themeColor: '',
      initiativeId: '',
      initiativeName: '',
      track: 'Customer Concerns'
    });
    
    // Clear the editor content
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  }, []);

  const openViewEpicModal = (epic: Epic) => {
    setViewingEpic(epic);
    setShowViewEpicModal(true);
  };

  const closeViewEpicModal = () => {
    setShowViewEpicModal(false);
    setViewingEpic(null);
    setIsEditingInViewModal(false);
    setEditingViewEpic(null);
  };

  const startEditingInViewModal = () => {
    if (viewingEpic) {
      setEditingViewEpic({ ...viewingEpic });
      setIsEditingInViewModal(true);
    }
  };

  const cancelEditingInViewModal = () => {
    setIsEditingInViewModal(false);
    setEditingViewEpic(null);
    setError('');
  };

  const updateEditingViewEpic = (field: keyof Epic, value: string) => {
    if (!editingViewEpic) return;
    
    setEditingViewEpic(prev => {
      if (!prev) return prev;
      
      // For description field, don't interfere with the rich text editor
      if (field === 'description') {
        return { ...prev, [field]: value };
      }
      
      const updatedEpic = { ...prev, [field]: value };
      
      // Update theme info when themeId changes
      if (field === 'themeId') {
        const selectedTheme = availableThemes.find(t => t.id === value);
        if (selectedTheme) {
          updatedEpic.themeName = selectedTheme.name;
          updatedEpic.themeColor = selectedTheme.color;
        } else {
          updatedEpic.themeName = '';
          updatedEpic.themeColor = '';
        }
      }
      
      // Update initiative info when initiativeId changes
      if (field === 'initiativeId') {
        const selectedInitiative = availableInitiatives.find(i => i.id === value);
        if (selectedInitiative) {
          updatedEpic.initiativeName = selectedInitiative.title;
        } else {
          updatedEpic.initiativeName = '';
        }
      }
      
      return updatedEpic;
    });
  };

  const saveEditedViewEpic = async () => {
    if (!editingViewEpic || !editingViewEpic.name.trim() || !editingViewEpic.themeId || !editingViewEpic.initiativeId) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Get description content from editor if it exists
      let description = editingViewEpic.description;
      if (editViewEditorRef.current) {
        description = editViewEditorRef.current.innerHTML.trim();
      }

      // Create the epic with cleaned description
      const epicToSave = {
        ...editingViewEpic,
        description: description || ''
      };

      // Update the epic in the epics array
      const updatedEpics = epics.map(epic => 
        epic.id === editingViewEpic.id ? epicToSave : epic
      );

      // Save to backend
      const response = await fetch(`http://localhost:8080/api/v3/products/${product?.productId}/backlog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          epics: JSON.stringify(updatedEpics)
        })
      });

      if (response.ok) {
        const savedData = await response.json();
        setProductBacklog(savedData);
        setEpics(updatedEpics);
        setViewingEpic(epicToSave);
        setSuccessMessage('Epic updated successfully!');
        setIsEditingInViewModal(false);
        setEditingViewEpic(null);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const errorText = await response.text();
        
        if (response.status === 401 || response.status === 403) {
          setError('Authentication expired. Please refresh the page and log in again.');
        } else if (response.status === 500) {
          setError('Server error occurred. Please try again later.');
        } else {
          setError('Failed to update epic. Please try again.');
        }
      }
    } catch (error: any) {
      setError('Failed to update epic. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEpic = async () => {
    if (newEpic.name.trim() && newEpic.themeId && newEpic.initiativeId) {
      try {
        setSaving(true);
        setError(''); // Clear any previous errors
        
        // Get description content from editor if it exists
        let description = newEpic.description;
        if (editorRef.current) {
          description = editorRef.current.innerHTML.trim();
        }
        
        // Create the epic with cleaned description
        const epicToSave = {
          ...newEpic,
          description: description || ''
        };
        
        const updatedEpics = [...epics, epicToSave];
        
        // Check if token exists
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in again.');
        }
        
        // Save to backend
        const response = await fetch(`http://localhost:8080/api/v3/products/${product?.productId}/backlog`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            epics: JSON.stringify(updatedEpics)
          })
        });

        if (response.ok) {
          const savedData = await response.json();
          setProductBacklog(savedData);
          setEpics(updatedEpics); // Update local state
          setSuccessMessage('Epic added successfully!');
          
          // Close modal and clear any errors
          setError('');
          closeAddEpicModal();
          
          // Clear success message after 5 seconds
          setTimeout(() => setSuccessMessage(''), 5000);
        } else {
          // Roll back the optimistic update
          setEpics(epics);
          const errorText = await response.text();
          
          if (response.status === 401 || response.status === 403) {
            setError('Authentication expired. Please refresh the page and log in again.');
          } else if (response.status === 500) {
            setError('Server error occurred. Please try again later.');
          } else {
            setError('Failed to add epic. Please try again.');
          }
        }
      } catch (error: any) {
        // Roll back the optimistic update
        setEpics(epics);
        
        if (error.message?.includes('authentication')) {
          setError(error.message);
        } else {
          setError('Failed to add epic. Please try again.');
        }
      } finally {
        setSaving(false);
      }
    } else {
      setError('Please fill in all required fields.');
    }
  };

  const updateNewEpic = (field: keyof Epic, value: string) => {
    setNewEpic(prev => {
      const updatedEpic = { ...prev, [field]: value };
      
      // Update theme info when themeId changes
      if (field === 'themeId') {
        const selectedTheme = availableThemes.find(t => t.id === value);
        if (selectedTheme) {
          updatedEpic.themeName = selectedTheme.name;
          updatedEpic.themeColor = selectedTheme.color;
        } else {
          updatedEpic.themeName = '';
          updatedEpic.themeColor = '';
        }
      }
      
      // Update initiative info when initiativeId changes
      if (field === 'initiativeId') {
        const selectedInitiative = availableInitiatives.find(i => i.id === value);
        if (selectedInitiative) {
          updatedEpic.initiativeName = selectedInitiative.title;
        } else {
          updatedEpic.initiativeName = '';
        }
      }
      
      return updatedEpic;
    });
  };

  // Rich text editor functions
  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
  };

  const handleRichTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    // Clean up the content and only update if it has actually changed
    const cleanContent = content.trim();
    if (cleanContent !== newEpic.description) {
      updateNewEpic('description', cleanContent);
    }
  };

  const handleRichTextBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Clean up any empty tags or normalize formatting
    const content = e.currentTarget.innerHTML;
    updateNewEpic('description', content);
  };

  const handleEditViewRichTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    // Only update the state, don't modify the content to avoid cursor jumping
    if (editingViewEpic) {
      setEditingViewEpic(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          description: content
        };
      });
    }
  };

  const handleEditViewRichTextBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Clean up any empty tags or normalize formatting
    const content = e.currentTarget.innerHTML;
    updateEditingViewEpic('description', content);
  };

  const updateEpic = (id: string, field: keyof Epic, value: string) => {
    setEpics(prev => prev.map(epic => {
      if (epic.id === id) {
        const updatedEpic = { ...epic, [field]: value };
        
        // Update theme info when themeId changes
        if (field === 'themeId') {
          const selectedTheme = availableThemes.find(t => t.id === value);
          if (selectedTheme) {
            updatedEpic.themeName = selectedTheme.name;
            updatedEpic.themeColor = selectedTheme.color;
          } else {
            updatedEpic.themeName = '';
            updatedEpic.themeColor = '';
          }
        }
        
        // Update initiative info when initiativeId changes
        if (field === 'initiativeId') {
          const selectedInitiative = availableInitiatives.find(i => i.id === value);
          if (selectedInitiative) {
            updatedEpic.initiativeName = selectedInitiative.title;
          } else {
            updatedEpic.initiativeName = '';
          }
        }
        
        return updatedEpic;
      }
      return epic;
    }));
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };


  const deleteEpic = (epicId: string) => {
    const epic = epics.find(e => e.id === epicId);
    if (epic) {
      setEpicToDelete(epic);
      setShowDeleteConfirmModal(true);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch(`http://localhost:8080/api/v3/products/${product?.productId}/backlog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          epics: JSON.stringify(epics.filter(e => e.name.trim() && e.themeId && e.initiativeId))
        })
      });

      if (response.ok) {
        const savedData = await response.json();
        setProductBacklog(savedData);
        setSuccessMessage('Product backlog saved successfully!');
        
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Failed to save product backlog data');
      }
    } catch (err: any) {
      setError('Failed to save product backlog data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || productLoading) {
    return (
      <div className="product-backlog-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading product backlog...</p>
        </div>
      </div>
    );
  }

  if ((error && !product) || productError) {
    return (
      <div className="product-backlog-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error || productError}</p>
          <button onClick={() => navigate(`/products/${productSlug}/modules`)} className="btn btn-primary">
            <span className="material-icons">arrow_back</span>
          </button>
        </div>
      </div>
    );
  }

  if (availableThemes.length === 0 || availableInitiatives.length === 0) {
    return (
      <div className="product-backlog-container">
        <div className="product-backlog-page-header">
          <div className="header-top-row">
            <div className="header-left">
              <button 
                onClick={() => navigate(`/products/${productSlug}/modules`)} 
                className="back-button"
                aria-label="Back to modules"
              >
                <span className="material-icons">arrow_back</span>
              </button>
              <h1 className="product-backlog-page-title">Product Backlog</h1>
            </div>
          </div>
        </div>
        
        <div className="error-state">
          <h3>Prerequisites Required</h3>
          <p>To create epics in the Product Backlog, you need to first define themes and initiatives in the Product Hypothesis module.</p>
          <button 
            onClick={() => navigate(`/products/${productSlug}/modules/hypothesis`)} 
            className="btn btn-primary"
          >
            Go to Product Hypothesis
          </button>
        </div>
      </div>
    );
  }

  // Delete Confirmation Modal Component
  const DeleteConfirmationModal = () => {
    const [holdProgress, setHoldProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [hasTriggered, setHasTriggered] = useState(false);

    const startHold = (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent duplicate events on touch devices
      e.preventDefault();
      
      if (isHolding || hasTriggered) return;
      setIsHolding(true);
      
      const interval = setInterval(() => {
        setHoldProgress(prev => {
          const newProgress = prev + 2; // Increment by 2% every 60ms (3 seconds total)
          if (newProgress >= 100 && !hasTriggered) {
            setHasTriggered(true);
            clearInterval(interval);
            handleDeleteConfirm();
            return 100;
          }
          return newProgress;
        });
      }, 60);
      setIntervalId(interval);
    };

    const stopHold = () => {
      setIsHolding(false);
      setHoldProgress(0);
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    };

    const handleDeleteConfirm = async () => {
      console.log('handleDeleteConfirm called', { epicToDelete, isDeleting, hasTriggered });
      
      if (!epicToDelete || isDeleting || hasTriggered) {
        console.log('Skipping delete - conditions not met');
        return;
      }
      
      const epicIdToDelete = epicToDelete.id;
      
      // Immediately prevent any further calls
      setShowDeleteConfirmModal(false);
      setEpicToDelete(null);
      setHoldProgress(0);
      setIsHolding(false);
      setHasTriggered(false);
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      // Close the view modal if it's open
      if (showViewEpicModal) {
        setShowViewEpicModal(false);
        setViewingEpic(null);
      }
      
      // Use the captured ID instead of epicToDelete which is now null
      await performDelete(epicIdToDelete);
    };

    const handleCancel = () => {
      stopHold();
      setShowDeleteConfirmModal(false);
      setEpicToDelete(null);
    };

    return (
      <div className="product-backlog-modal-overlay" onClick={handleCancel}>
        <div className="product-backlog-modal-content delete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
          <div className="product-backlog-modal-header">
            <h2>Delete Epic</h2>
            <button className="product-backlog-modal-close-btn" onClick={handleCancel}>
              <span className="material-icons">close</span>
            </button>
          </div>
          <div className="product-backlog-modal-body delete-modal-body">
            <div className="warning-icon">
              <span className="material-icons">warning</span>
            </div>
            <div className="delete-message">
              <p><strong>Are you sure you want to delete "{epicToDelete?.name}"?</strong></p>
              <p className="warning-text">This action cannot be undone. This epic may be referenced in other parts of the system including roadmaps and hypotheses.</p>
            </div>
          </div>
          <div className="product-backlog-modal-footer delete-modal-footer">
            <button onClick={handleCancel} className="btn-cancel">Cancel</button>
            <button 
              className={`btn-delete-hold ${isHolding ? 'holding' : ''}`}
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              disabled={holdProgress >= 100 || hasTriggered}
            >
              <div className="hold-progress" style={{ width: `${holdProgress}%` }}></div>
              <span className="hold-text">
                {holdProgress >= 100 ? 'Deleting...' : 'Hold to Delete'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const performDelete = async (epicId: string) => {
    // Use ref to prevent duplicate calls (survives React.StrictMode double-rendering)
    if (deleteRequestRef.current.has(epicId)) {
      console.log('Delete already in progress for epic:', epicId);
      return;
    }
    
    const requestId = `delete-${epicId}-${Date.now()}`;
    console.log('Starting delete request:', requestId);
    
    // Mark this epic as being deleted
    deleteRequestRef.current.add(epicId);
    
    try {
      setIsDeleting(true);
      setDeletingEpicId(epicId);
      
      // Clear any existing messages at the start
      setError('');
      setSuccessMessage('');

      // Save to backend with updated epics array (without the deleted epic)
      const updatedEpics = epics.filter(epic => epic.id !== epicId);
      
      console.log(`Making API call for ${requestId}`);
      const response = await fetch(`http://localhost:8080/api/v3/products/${product?.productId}/backlog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Request-Id': requestId
        },
        body: JSON.stringify({
          epics: JSON.stringify(updatedEpics)
        })
      });

      if (response.ok) {
        // Deletion successful - update UI immediately
        setEpics(updatedEpics);
        setSuccessMessage('Epic deleted successfully!');
        
        // Try to parse response data if available
        try {
          const responseText = await response.text();
          if (responseText.trim()) {
            const savedData = JSON.parse(responseText);
            setProductBacklog(savedData);
            
            if (savedData && savedData.epics) {
              const parsedEpics = typeof savedData.epics === 'string' 
                ? JSON.parse(savedData.epics) 
                : savedData.epics;
              setEpics(parsedEpics);
            }
          }
        } catch (parseError) {
          // Response parsing failed but deletion succeeded, keep the optimistic update
          console.warn('Response parsing failed but deletion succeeded');
        }
        
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        // Deletion failed
        const errorText = await response.text();
        console.error('Delete failed:', response.status, errorText);
        setError('Failed to delete epic. Please try again.');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      setError('Failed to delete epic. Please try again.');
    } finally {
      setDeletingEpicId(null);
      setIsDeleting(false);
      // Clean up after a short delay to handle any trailing duplicate calls
      setTimeout(() => {
        deleteRequestRef.current.delete(epicId);
      }, 1000);
    }
  };

  return (
    <div className="product-backlog-container">
      <div className="product-backlog-page-header">
        <div className="header-top-row">
          <div className="header-left">
            <button 
              onClick={() => navigate(`/products/${productSlug}/modules`)} 
              className="back-button"
              aria-label="Back to modules"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            <h1 className="product-backlog-page-title">Product Backlog</h1>
          </div>
          {!loading && (
            <button
              onClick={openAddEpicModal}
              className="add-epic-btn"
              aria-label="Add new epic"
            >
              <span className="material-icons">add</span>
              Add Epic
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="content-layout">
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">
              <span className="material-icons">task_alt</span>
            </div>
            <div className="section-info">
              <h3 className="section-title">Epic Management</h3>
              <p className="section-description">
                Create and manage epics by selecting themes, initiatives and track.
              </p>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="search-filter-controls">
            <div className="search-bar">
              <div className="search-input-wrapper">
                <span className="material-icons search-icon">search</span>
                <input
                  type="text"
                  placeholder="Search epics by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="clear-search-btn"
                    title="Clear search"
                  >
                    <span className="material-icons">close</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="filter-row">
              <div className="filter-group">
                <label>Filter by Theme:</label>
                <select
                  value={selectedThemeFilter}
                  onChange={(e) => setSelectedThemeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Themes</option>
                  {availableThemes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Filter by Initiative:</label>
                <select
                  value={selectedInitiativeFilter}
                  onChange={(e) => setSelectedInitiativeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Initiatives</option>
                  {availableInitiatives.map((initiative) => (
                    <option key={initiative.id} value={initiative.id}>
                      {initiative.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Filter by Track:</label>
                <select
                  value={selectedTrackFilter}
                  onChange={(e) => setSelectedTrackFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Tracks</option>
                  <option value="Customer Concerns">Customer Concerns</option>
                  <option value="Innovation">Innovation</option>
                  <option value="Scale">Scale</option>
                </select>
              </div>
              
              {(searchTerm || selectedThemeFilter || selectedInitiativeFilter || selectedTrackFilter) && (
                <button
                  onClick={clearAllFilters}
                  className="clear-filters-btn"
                  title="Clear all filters"
                >
                  <span className="material-icons">refresh</span>
                  Clear All
                </button>
              )}
            </div>
          </div>
          
          <div className="epics-container">
            {epics.length > 0 ? (
              filteredEpics.length > 0 ? (
                <div className="epics-table-wrapper">
                  <table className="epics-table">
                    <thead>
                      <tr>
                        <th className="epic-name-col">Epic Name</th>
                        <th className="epic-theme-col">Theme</th>
                        <th className="epic-initiative-col">Initiative</th>
                        <th className="epic-track-col">Track</th>
                        <th className="epic-actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEpics.map((epic) => (
                      <tr key={epic.id} className="epic-row">
                        <td className="epic-name-cell">
                          <button 
                            className="epic-name-btn"
                            onClick={() => openViewEpicModal(epic)}
                            title="View epic details"
                          >
                            {epic.name}
                          </button>
                        </td>
                        <td className="epic-theme-cell">
                          {epic.themeName || '—'}
                        </td>
                        <td className="epic-initiative-cell">
                          {epic.initiativeName || '—'}
                        </td>
                        <td className="epic-track-cell">
                          {epic.track}
                        </td>
                        <td className="epic-actions-cell">
                          <button
                            onClick={() => deleteEpic(epic.id)}
                            disabled={deletingEpicId === epic.id}
                            className="delete-epic-btn"
                            title="Delete epic"
                          >
                            <span className="material-icons">
                              {deletingEpicId === epic.id ? 'hourglass_empty' : 'delete'}
                            </span>
                          </button>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state-table">
                  <span className="empty-text">
                    No epics match the current search and filter criteria. 
                    {(searchTerm || selectedThemeFilter || selectedInitiativeFilter || selectedTrackFilter) && (
                      <button 
                        onClick={clearAllFilters} 
                        className="clear-filters-link"
                      >
                        Clear all filters
                      </button>
                    )}
                  </span>
                </div>
              )
            ) : (
              <div className="empty-state-table">
                <span className="empty-text">No epics defined yet</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {productBacklog.updatedAt && (
        <div className="last-updated">
          Last updated: {new Date(productBacklog.updatedAt).toLocaleString()}
        </div>
      )}

      {/* Add Epic Modal */}
      {showAddEpicModal && (
        <div className="product-backlog-modal-overlay" onClick={closeAddEpicModal}>
          <div className="product-backlog-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="product-backlog-modal-header">
              <h2>Add New Epic</h2>
              <button className="product-backlog-modal-close-btn" onClick={closeAddEpicModal}>
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="product-backlog-modal-body">
              <div className="epic-form">
                <div className="form-row-three">
                  <div className="form-group">
                    <label>Theme *</label>
                    <select
                      value={newEpic.themeId}
                      onChange={(e) => updateNewEpic('themeId', e.target.value)}
                      className="epic-theme-select"
                      required
                    >
                      <option value="">Select Theme</option>
                      {availableThemes.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {theme.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Initiative *</label>
                    <select
                      value={newEpic.initiativeId}
                      onChange={(e) => updateNewEpic('initiativeId', e.target.value)}
                      className="epic-initiative-select"
                      required
                    >
                      <option value="">Select Initiative</option>
                      {availableInitiatives.map((initiative) => (
                        <option key={initiative.id} value={initiative.id}>
                          {initiative.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Track *</label>
                    <select
                      value={newEpic.track}
                      onChange={(e) => updateNewEpic('track', e.target.value)}
                      className="epic-track-select"
                      required
                    >
                      <option value="Customer Concerns">Customer Concerns</option>
                      <option value="Innovation">Innovation</option>
                      <option value="Scale">Scale</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Epic Name *</label>
                  <input
                    type="text"
                    value={newEpic.name}
                    onChange={(e) => updateNewEpic('name', e.target.value)}
                    placeholder="Enter epic name"
                    className="epic-name-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <div className="rich-text-editor">
                    <div className="rich-text-toolbar">
                      <select
                        onChange={(e) => execCommand('fontSize', e.target.value)}
                        className="toolbar-select"
                        title="Font Size"
                        defaultValue="3"
                      >
                        <option value="1">Small</option>
                        <option value="2">Smaller</option>
                        <option value="3">Normal</option>
                        <option value="4">Medium</option>
                        <option value="5">Large</option>
                        <option value="6">Larger</option>
                        <option value="7">Largest</option>
                      </select>
                      <div className="toolbar-separator"></div>
                      <button
                        type="button"
                        onClick={() => execCommand('bold')}
                        className="toolbar-btn"
                        title="Bold"
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => execCommand('italic')}
                        className="toolbar-btn"
                        title="Italic"
                      >
                        <em>I</em>
                      </button>
                      <button
                        type="button"
                        onClick={() => execCommand('underline')}
                        className="toolbar-btn"
                        title="Underline"
                      >
                        <u>U</u>
                      </button>
                      <div className="toolbar-separator"></div>
                      <button
                        type="button"
                        onClick={() => execCommand('insertUnorderedList')}
                        className="toolbar-btn"
                        title="Bullet List"
                      >
                        <span className="material-icons">format_list_bulleted</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => execCommand('insertOrderedList')}
                        className="toolbar-btn"
                        title="Numbered List"
                      >
                        <span className="material-icons">format_list_numbered</span>
                      </button>
                    </div>
                    <div
                      ref={editorRef}
                      contentEditable
                      className="epic-description-editor"
                      onInput={handleRichTextChange}
                      onBlur={handleRichTextBlur}
                      data-placeholder="Epic description (optional) - use the toolbar above to format text"
                      suppressContentEditableWarning={true}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="product-backlog-modal-footer">
              <button 
                onClick={handleAddEpic}
                disabled={saving || !newEpic.name.trim() || !newEpic.themeId || !newEpic.initiativeId}
                className="modal-btn-primary"
              >
                <span className="material-icons">{saving ? 'hourglass_empty' : 'save'}</span>
                {saving ? 'Saving...' : 'Save Epic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Epic Modal */}
      {showViewEpicModal && viewingEpic && (
        <div className="product-backlog-modal-overlay" onClick={closeViewEpicModal}>
          <div className="product-backlog-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="product-backlog-modal-header">
              <h2>{isEditingInViewModal ? 'Edit Epic' : 'Epic Details'}</h2>
              <button className="product-backlog-modal-close-btn" onClick={closeViewEpicModal}>
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="product-backlog-modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              
              <div className="epic-form">
                <div className="form-row-three">
                  <div className="form-group">
                    <label>Theme{isEditingInViewModal && ' *'}</label>
                    {isEditingInViewModal && editingViewEpic ? (
                      <select
                        value={editingViewEpic.themeId}
                        onChange={(e) => updateEditingViewEpic('themeId', e.target.value)}
                        className="epic-theme-select"
                        required
                      >
                        <option value="">Select Theme</option>
                        {availableThemes.map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            {theme.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="view-field">
                        {viewingEpic.themeName || 'No theme assigned'}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Initiative{isEditingInViewModal && ' *'}</label>
                    {isEditingInViewModal && editingViewEpic ? (
                      <select
                        value={editingViewEpic.initiativeId}
                        onChange={(e) => updateEditingViewEpic('initiativeId', e.target.value)}
                        className="epic-initiative-select"
                        required
                      >
                        <option value="">Select Initiative</option>
                        {availableInitiatives.map((initiative) => (
                          <option key={initiative.id} value={initiative.id}>
                            {initiative.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="view-field">
                        {viewingEpic.initiativeName || 'No initiative assigned'}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Track{isEditingInViewModal && ' *'}</label>
                    {isEditingInViewModal && editingViewEpic ? (
                      <select
                        value={editingViewEpic.track}
                        onChange={(e) => updateEditingViewEpic('track', e.target.value)}
                        className="epic-track-select"
                        required
                      >
                        <option value="Customer Concerns">Customer Concerns</option>
                        <option value="Innovation">Innovation</option>
                        <option value="Scale">Scale</option>
                      </select>
                    ) : (
                      <div className="view-field">
                        {viewingEpic.track}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Epic Name{isEditingInViewModal && ' *'}</label>
                  {isEditingInViewModal && editingViewEpic ? (
                    <input
                      type="text"
                      value={editingViewEpic.name}
                      onChange={(e) => updateEditingViewEpic('name', e.target.value)}
                      placeholder="Enter epic name"
                      className="epic-name-input"
                      required
                    />
                  ) : (
                    <div className="view-field epic-name-view">
                      {viewingEpic.name}
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  {isEditingInViewModal && editingViewEpic ? (
                    <div className="rich-text-editor">
                      <div className="rich-text-toolbar">
                        <select
                          onChange={(e) => execCommand('fontSize', e.target.value)}
                          className="toolbar-select"
                          title="Font Size"
                          defaultValue="3"
                        >
                          <option value="1">Small</option>
                          <option value="2">Smaller</option>
                          <option value="3">Normal</option>
                          <option value="4">Medium</option>
                          <option value="5">Large</option>
                          <option value="6">Larger</option>
                          <option value="7">Largest</option>
                        </select>
                        <div className="toolbar-separator"></div>
                        <button
                          type="button"
                          onClick={() => execCommand('bold')}
                          className="toolbar-btn"
                          title="Bold"
                        >
                          <strong>B</strong>
                        </button>
                        <button
                          type="button"
                          onClick={() => execCommand('italic')}
                          className="toolbar-btn"
                          title="Italic"
                        >
                          <em>I</em>
                        </button>
                        <button
                          type="button"
                          onClick={() => execCommand('underline')}
                          className="toolbar-btn"
                          title="Underline"
                        >
                          <u>U</u>
                        </button>
                        <div className="toolbar-separator"></div>
                        <button
                          type="button"
                          onClick={() => execCommand('insertUnorderedList')}
                          className="toolbar-btn"
                          title="Bullet List"
                        >
                          <span className="material-icons">format_list_bulleted</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => execCommand('insertOrderedList')}
                          className="toolbar-btn"
                          title="Numbered List"
                        >
                          <span className="material-icons">format_list_numbered</span>
                        </button>
                      </div>
                      <div
                        ref={editViewEditorRef}
                        contentEditable
                        className="epic-description-editor"
                        onInput={handleEditViewRichTextChange}
                        onBlur={handleEditViewRichTextBlur}
                        data-placeholder="Epic description (optional) - use the toolbar above to format text"
                        suppressContentEditableWarning={true}
                      />
                    </div>
                  ) : (
                    <div className="view-field epic-description-view">
                      {viewingEpic.description ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: viewingEpic.description }}
                        />
                      ) : (
                        'No description provided'
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="product-backlog-modal-footer">
              {isEditingInViewModal ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={cancelEditingInViewModal}
                    className="btn-cancel"
                    disabled={saving}
                  >
                    <span className="material-icons">close</span>
                    Cancel
                  </button>
                  <button 
                    onClick={saveEditedViewEpic}
                    disabled={saving || !editingViewEpic?.name.trim() || !editingViewEpic?.themeId || !editingViewEpic?.initiativeId}
                    className="modal-btn-primary"
                  >
                    <span className="material-icons">{saving ? 'hourglass_empty' : 'save'}</span>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => {
                      if (viewingEpic) {
                        deleteEpic(viewingEpic.id);
                      }
                    }}
                    className="btn-delete"
                    disabled={deletingEpicId === viewingEpic?.id}
                  >
                    <span className="material-icons">
                      {deletingEpicId === viewingEpic?.id ? 'hourglass_empty' : 'delete'}
                    </span>
                    Delete
                  </button>
                  <button 
                    onClick={startEditingInViewModal}
                    className="btn-edit"
                  >
                    <span className="material-icons">edit</span>
                    Edit
                  </button>
                  <button 
                    onClick={closeViewEpicModal}
                    className="btn-close"
                  >
                    <span className="material-icons">check</span>
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && <DeleteConfirmationModal />}
    </div>
  );
};

export default React.memo(ProductBacklog);