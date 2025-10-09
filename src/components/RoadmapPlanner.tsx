import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import { API_BASE_URL } from '../config';
import './RoadmapPlanner.css';
import './ProductBacklog.css';

interface UserStory {
  id?: number;
  title: string;
  description: string;
  acceptanceCriteria?: string;
  priority: 'High' | 'Medium' | 'Low';
  storyPoints?: number;
  status?: 'Draft' | 'Ready' | 'In Progress' | 'Done' | 'Blocked';
  displayOrder?: number;
}

interface RoadmapItem {
  epicId: string;
  epicName: string;
  epicDescription: string;
  priority: string;
  status: string;
  estimatedEffort: string;
  assignedTeam: string;
  reach: number;
  impact: number;
  confidence: number;
  riceScore: number;
  effortRating?: number; // Auto-filled from capacity planning
  startDate?: string;
  endDate?: string;
  published?: boolean; // Track published status
  initiativeId?: string;
  initiativeName?: string;
  themeId?: string;
  themeName?: string;
  themeColor?: string;
  track?: string;
}

interface RoadmapPlannerData {
  id?: number;
  productId: number;
  year: number;
  quarter: number;
  roadmapItems: RoadmapItem[];
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
  userStories?: UserStory[];
}

// Helper functions for quarter date calculations
const getQuarterStartDate = (year: number, quarter: number): string => {
  const month = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
  const date = new Date(year, month, 1);
  return date.getFullYear() + '-' + 
         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
         String(date.getDate()).padStart(2, '0');
};

const getQuarterEndDate = (year: number, quarter: number): string => {
  const month = quarter * 3; // Q1=3, Q2=6, Q3=9, Q4=12
  const date = new Date(year, month, 0); // Day 0 = last day of previous month
  return date.getFullYear() + '-' + 
         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
         String(date.getDate()).padStart(2, '0');
};

const RoadmapPlanner: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { product, loading: productLoading, error: productError } = useProduct(productSlug);
  
  const [roadmapData, setRoadmapData] = useState<RoadmapPlannerData | null>(null);
  const [availableEpics, setAvailableEpics] = useState<Epic[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showEpicModal, setShowEpicModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const publishRequestRef = useRef<Set<string>>(new Set());
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set());
  const [epicSearchTerm, setEpicSearchTerm] = useState('');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('');
  const [selectedInitiativeFilter, setSelectedInitiativeFilter] = useState('');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState('');
  const [assignedEpicIds, setAssignedEpicIds] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewingEpic, setViewingEpic] = useState<Epic | null>(null);
  const [showViewEpicModal, setShowViewEpicModal] = useState(false);
  const [isEditingEpic, setIsEditingEpic] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [savingEpic, setSavingEpic] = useState(false);

  // User Story state
  const [editModeUserStories, setEditModeUserStories] = useState<UserStory[]>([]);
  const [editModeNewUserStory, setEditModeNewUserStory] = useState<UserStory>({
    title: '',
    description: '',
    acceptanceCriteria: '',
    priority: 'Medium' as const,
    storyPoints: undefined,
    status: 'Draft' as const,
    displayOrder: 0
  });
  const [showEditStoryForm, setShowEditStoryForm] = useState(false);
  const [editModeStoryIndex, setEditModeStoryIndex] = useState<number | null>(null);
  const editModeStoryEditorRef = useRef<HTMLDivElement>(null);
  const [editModeExpandedStories, setEditModeExpandedStories] = useState<Set<number>>(new Set());

  const loadRoadmapData = async () => {
    
    if (!product) {
      return;
    }
    
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const url = `${API_BASE_URL}/v2/products/${product.productId}/roadmap/${selectedYear}/${selectedQuarter}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });


      if (response.ok) {
        const data = await response.json();
        // Ensure all items have dates (use quarter defaults if missing from backend)
        if (data.roadmapItems) {
          data.roadmapItems = data.roadmapItems.map((item: RoadmapItem) => ({
            ...item,
            startDate: item.startDate || getQuarterStartDate(selectedYear, selectedQuarter),
            endDate: item.endDate || getQuarterEndDate(selectedYear, selectedQuarter)
          }));
        }
        setRoadmapData(data);
        const epicIds = data.roadmapItems?.map((item: RoadmapItem) => item.epicId) || [];
        setSelectedEpics(new Set(epicIds));
      } else if (response.status === 404) {
        // No roadmap exists for this quarter yet
        setRoadmapData({
          productId: product.productId,
          year: selectedYear,
          quarter: selectedQuarter,
          roadmapItems: []
        });
        setSelectedEpics(new Set());
      } else {
        throw new Error('Failed to load roadmap data');
      }
    } catch (err: any) {
      setError('Failed to load roadmap data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableEpics = async () => {
    if (!product) {
      return;
    }

    try {
      // Get all epics regardless of status for Roadmap Planner Add/Remove modal
      const response = await fetch(`${API_BASE_URL}/v3/products/${product.productId}/backlog?backlogOnly=false`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const backlogData = await response.json();

        if (backlogData && backlogData.epics) {
          const epicsArray = JSON.parse(backlogData.epics);
          setAvailableEpics(epicsArray);
        } else {
          setAvailableEpics([]);
        }
      } else {
      }
    } catch (err) {
    }
  };

  const loadAssignedEpicIds = async () => {
    if (!product) return;
    
    try {
      // Fetch epic IDs that are already assigned to other quarters
      const response = await fetch(
        `${API_BASE_URL}/products/${product.productId}/roadmap/assigned-epics?excludeYear=${selectedYear}&excludeQuarter=${selectedQuarter}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const epicIds = await response.json();
        setAssignedEpicIds(new Set(epicIds));
      }
    } catch (err) {
    }
  };
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (product) {
      setInlineError(''); // Clear any previous error messages
      
      // Force call loadRoadmapData even if there are issues
      loadRoadmapData().catch(err => {
      });
      
      loadAvailableEpics();
      loadAssignedEpicIds();
    } else {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedYear, selectedQuarter]);

  const saveRoadmap = async () => {
    try {
      
      setLoading(true);
      
      let roadmapItems: RoadmapItem[] = [];

      if (isEditMode) {
        // In edit mode, save the current roadmapData items
        // Ensure all items have dates (use quarter defaults if missing)
        roadmapItems = (roadmapData?.roadmapItems || []).map(item => {
          const { published, ...itemWithoutPublished } = item;
          return {
            ...itemWithoutPublished,
            startDate: item.startDate || getQuarterStartDate(selectedYear, selectedQuarter),
            endDate: item.endDate || getQuarterEndDate(selectedYear, selectedQuarter)
            // Don't send published field - let backend manage it
          };
        });
      } else {
        // When adding/removing epics from the modal
        // Only keep epics that are selected in the modal
        const existingItems = roadmapData?.roadmapItems || [];
        
        
        // Build roadmapItems based on selectedEpics (this handles both adding and removing)
        roadmapItems = Array.from(selectedEpics).map(epicId => {
          const epic = availableEpics.find(e => e.id === epicId);
          const existingItem = existingItems.find(item => item.epicId === epicId);
          
          if (existingItem) {
            // Keep existing item data if epic was already in roadmap
            return existingItem;
          } else {
            // Create new item for newly added epic
            const reach = 0;
            const impact = 0;
            const confidence = 0;
            const effort = 1;
            const riceScore = effort > 0 ? (impact * confidence * reach) / effort : 0;
            
            return {
              epicId,
              epicName: epic?.name || '',
              epicDescription: epic?.description || '',
              priority: 'Medium',
              status: 'Proposed',
              estimatedEffort: '',
              assignedTeam: '',
              reach,
              impact,
              confidence,
              riceScore,
              effortRating: 1,
              startDate: getQuarterStartDate(selectedYear, selectedQuarter),
              endDate: getQuarterEndDate(selectedYear, selectedQuarter),
              published: false // New items start as unpublished
            };
          }
        });
        
        
      }

      const requestData = {
        year: selectedYear,
        quarter: selectedQuarter,
        roadmapItems
      };


      const response = await fetch(`${API_BASE_URL}/v2/products/${product?.productId}/roadmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        setInlineError(''); // Clear any error messages on successful save
        setHasUnsavedChanges(false); // Clear unsaved changes flag
        await Promise.all([
          loadRoadmapData(),
          loadAvailableEpics(), // Refresh backlog list after save
          loadAssignedEpicIds() // Refresh assigned epic IDs after save
        ]);
        if (isEditMode) {
          setIsEditMode(false);
        }
        setShowEpicModal(false);
      } else if (response.status === 409) {
        // Handle epic conflict error
        const errorText = await response.text();
        setInlineError(errorText);
      } else {
        throw new Error('Failed to save roadmap');
      }
    } catch (err) {
      setError('Failed to save roadmap');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishQuarter = () => {
    if (!roadmapData?.roadmapItems?.length) {
      setInlineError('No items to publish in this quarter');
      return;
    }

    setShowPublishModal(true);
  };

  const performPublish = async () => {
    // Prevent duplicate calls
    const publishKey = `${selectedYear}-Q${selectedQuarter}`;
    if (publishRequestRef.current.has(publishKey)) {
      return;
    }

    publishRequestRef.current.add(publishKey);

    try {
      setIsPublishing(true);
      setError('');
      setInlineError('');

      // Exit edit mode if needed
      if (isEditMode) {
        setIsEditMode(false);
        setHasUnsavedChanges(false);
      }

      // Get ALL epic IDs to publish - no filtering, publish everything
      const epicIdsToPublish = (roadmapData?.roadmapItems || [])
        .map(item => item.epicId);

      const response = await fetch(
        `${API_BASE_URL}/v2/products/${product?.productId}/roadmap/${selectedYear}/${selectedQuarter}/publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            epicIds: epicIdsToPublish
          })
        }
      );

      if (response.ok) {
        setInlineError('');
        // Reload roadmap data to reflect published state
        await loadRoadmapData();
        // Show success message
        setSuccessMessage(`Successfully published Q${selectedQuarter} ${selectedYear} roadmap!`);
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const errorText = await response.text();
        setInlineError(errorText || 'Failed to publish roadmap');
      }
    } catch (error) {
      // Handle publish error silently
      setInlineError('Failed to publish roadmap. Please try again.');
    } finally {
      setIsPublishing(false);
      setTimeout(() => {
        publishRequestRef.current.delete(publishKey);
      }, 1000);
    }
  };

  // Publish Confirmation Modal Component
  const PublishConfirmationModal = () => {
    const [holdProgress, setHoldProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [hasTriggered, setHasTriggered] = useState(false);

    const startHold = (e: React.MouseEvent) => {
      e.preventDefault();
      
      if (isHolding || hasTriggered) return;
      setIsHolding(true);
      
      const interval = setInterval(() => {
        setHoldProgress(prev => {
          const newProgress = prev + 2; // Increment by 2% every 60ms (3 seconds total)
          if (newProgress >= 100 && !hasTriggered) {
            setHasTriggered(true);
            clearInterval(interval);
            // Call handlePublishConfirm after a small delay to ensure state updates
            setTimeout(() => {
              handlePublishConfirm(true);
            }, 50);
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

    const handlePublishConfirm = async (forcePublish = false) => {
      if (!forcePublish && (!hasTriggered || isPublishing)) {
        return;
      }
      
      // Close modal and reset state
      setShowPublishModal(false);
      setHoldProgress(0);
      setIsHolding(false);
      setHasTriggered(false);
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      
      // Perform the publish
      await performPublish();
    };

    const handleCancel = () => {
      stopHold();
      setShowPublishModal(false);
    };

    // Count ALL items - no filtering
    const committedCount = roadmapData?.roadmapItems?.length || 0;

    const proposedCount = 0; // We're publishing everything, so no "proposed only" count

    return (
      <div className="modal-overlay" onClick={handleCancel}>
        <div className="epic-selection-modal publish-confirmation-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Publish Q{selectedQuarter} {selectedYear} Roadmap</h3>
            <button className="modal-close-btn" onClick={handleCancel}>
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <div className="modal-body publish-modal-body">
            <div className="warning-icon">
              <span className="material-icons">publish</span>
            </div>
            
            <div className="publish-message">
              <p><strong>Are you sure you want to publish this quarter's roadmap?</strong></p>
              
              <div className="publish-summary">
                <div className="summary-item">
                  <span className="material-icons success">check_circle</span>
                  <span>{committedCount} items will be published to Roadmap Visualization</span>
                </div>
                {proposedCount > 0 && (
                  <div className="summary-item">
                    <span className="material-icons warning">info</span>
                    <span>{proposedCount} proposed items will be removed from this planner</span>
                  </div>
                )}
              </div>
              
              <p className="warning-text">
                Published items (To-Do, Committed, In-Progress, Complete, Carried Over) will appear in the Roadmap Visualization.
                Proposed items will be removed from the planner and remain in the backlog only.
              </p>
            </div>
          </div>
          
          <div className="modal-actions publish-modal-footer">
            <button onClick={handleCancel} className="btn-cancel">Cancel</button>
            <button 
              className={`btn-publish-hold ${isHolding ? 'holding' : ''}`}
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              disabled={holdProgress >= 100 || hasTriggered || isPublishing}
            >
              <div className="hold-progress" style={{ width: `${holdProgress}%` }}></div>
              <span className="hold-text">
                {holdProgress >= 100 ? 'Publishing...' : 'Hold to Publish'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const updateRoadmapItem = async (epicId: string, field: keyof RoadmapItem, value: string | number) => {
    if (!roadmapData) return;

    // Mark as having unsaved changes when in edit mode
    if (isEditMode) {
      setHasUnsavedChanges(true);
    }

    // For effortRating, use the specific endpoint (only in view mode since it's auto-filled)
    if (field === 'effortRating' && !isEditMode) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/v2/products/${product?.productId}/roadmap/${selectedYear}/${selectedQuarter}/epics/${epicId}/effort-rating`, 
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              effortRating: value
            })
          }
        );

        if (response.ok) {
          // Update local state on successful backend update
          const updatedItems = roadmapData.roadmapItems.map(item => {
            if (item.epicId === epicId) {
              return { ...item, effortRating: value as number };
            }
            return item;
          });
          
          setRoadmapData({
            ...roadmapData,
            roadmapItems: updatedItems
          });
          
        } else {
          throw new Error('Failed to update effort rating');
        }
      } catch (err) {
      }
      return;
    }
    
    const updatedItems = roadmapData.roadmapItems.map(item => {
      if (item.epicId === epicId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate RICE score if any RICE component was updated
        if (['reach', 'impact', 'confidence', 'effortRating'].includes(field)) {
          const reach = field === 'reach' ? value as number : updatedItem.reach || 0;
          const impact = field === 'impact' ? value as number : updatedItem.impact || 0;
          const confidence = field === 'confidence' ? value as number : updatedItem.confidence || 0;
          const effort = field === 'effortRating' ? value as number : updatedItem.effortRating || 1;
          updatedItem.riceScore = effort > 0 ? (impact * confidence * reach) / effort : 0;
        }
        
        return updatedItem;
      }
      return item;
    });
    
    const updatedRoadmapData = {
      ...roadmapData,
      roadmapItems: updatedItems
    };
    
    setRoadmapData(updatedRoadmapData);
    
    // Auto-save only if NOT in edit mode
    // In edit mode, changes should be saved explicitly to avoid issues with publishing
    const shouldAutoSave = !isEditMode;
    
    if (shouldAutoSave) {
      
      try {
        const response = await fetch(`${API_BASE_URL}/v2/products/${product?.productId}/roadmap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            year: selectedYear,
            quarter: selectedQuarter,
            roadmapItems: updatedItems.map(item => {
              const { published, ...itemWithoutPublished } = item;
              return {
                ...itemWithoutPublished,
                startDate: item.startDate || getQuarterStartDate(selectedYear, selectedQuarter),
                endDate: item.endDate || getQuarterEndDate(selectedYear, selectedQuarter)
                // DON'T send published field - let backend maintain it
              };
            })
          })
        });

        if (!response.ok) {
          if (response.status === 409) {
            // Handle epic conflict error in auto-save
            const errorText = await response.text();
            setInlineError(errorText);
            // Revert the local change since it conflicts
            await loadRoadmapData();
          } else {
            throw new Error('Failed to save roadmap item');
          }
        } else {
          setInlineError(''); // Clear any error messages on successful auto-save
        }
      } catch (err) {
        // Optionally show a toast notification or error message
      }
    } else {
    }
  };

  const toggleEpicSelection = useCallback((epicId: string) => {
    const newSelection = new Set(selectedEpics);
    if (newSelection.has(epicId)) {
      newSelection.delete(epicId);
    } else {
      newSelection.add(epicId);
    }
    setSelectedEpics(newSelection);
  }, [selectedEpics]);

  // Filter epics based on search and filters, excluding those already assigned to other quarters
  const filteredAvailableEpics = useMemo(() => {
    return availableEpics.filter(epic => {
      // First check if epic is already assigned to another quarter
      if (assignedEpicIds.has(epic.id)) {
        return false; // Don't show epics that are already in other quarters
      }
      
      const matchesSearch = epicSearchTerm === '' || 
        epic.name.toLowerCase().includes(epicSearchTerm.toLowerCase());
      const matchesTheme = selectedThemeFilter === '' || epic.themeName === selectedThemeFilter;
      const matchesInitiative = selectedInitiativeFilter === '' || epic.initiativeName === selectedInitiativeFilter;
      const matchesTrack = selectedTrackFilter === '' || epic.track === selectedTrackFilter;
      
      return matchesSearch && matchesTheme && matchesInitiative && matchesTrack;
    });
  }, [availableEpics, assignedEpicIds, epicSearchTerm, selectedThemeFilter, selectedInitiativeFilter, selectedTrackFilter]);
  

  // Get unique values for filter options
  const uniqueThemes = useMemo(() => {
    return Array.from(new Set(availableEpics.map(epic => epic.themeName).filter(Boolean)));
  }, [availableEpics]);
  
  const uniqueInitiatives = useMemo(() => {
    return Array.from(new Set(availableEpics.map(epic => epic.initiativeName).filter(Boolean)));
  }, [availableEpics]);
  
  const uniqueTracks = useMemo(() => {
    return Array.from(new Set(availableEpics.map(epic => epic.track).filter(Boolean)));
  }, [availableEpics]);

  const clearEpicFilters = useCallback(() => {
    setEpicSearchTerm('');
    setSelectedThemeFilter('');
    setSelectedInitiativeFilter('');
    setSelectedTrackFilter('');
  }, []);

  const openViewEpicModal = async (epicId: string) => {
    // First try to find in availableEpics
    let epic = availableEpics.find(e => e.id === epicId);

    // If not found, build from roadmap item
    if (!epic) {
      const roadmapItem = roadmapData?.roadmapItems.find(item => item.epicId === epicId);
      if (roadmapItem) {
        epic = {
          id: roadmapItem.epicId,
          name: roadmapItem.epicName,
          description: roadmapItem.epicDescription || '',
          themeId: roadmapItem.themeId || '',
          themeName: roadmapItem.themeName || '',
          themeColor: roadmapItem.themeColor || '',
          initiativeId: roadmapItem.initiativeId || '',
          initiativeName: roadmapItem.initiativeName || '',
          track: roadmapItem.track || '',
          userStories: []
        };
      }
    }

    if (epic) {
      // ALWAYS fetch user stories from backend for this epic
      try {
        const response = await fetch(
          `${API_BASE_URL}/v3/products/${product?.productId}/epics/${epicId}/user-stories`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (response.ok) {
          const stories = await response.json();
          epic = { ...epic, userStories: stories };
        } else {
          epic = { ...epic, userStories: [] };
        }
      } catch (error) {
        console.warn('Failed to load user stories:', error);
        epic = { ...epic, userStories: [] };
      }

      setViewingEpic(epic);
      setShowViewEpicModal(true);
      setIsEditingEpic(false);
      setEditingEpic(null);
    }
  };

  const closeViewEpicModal = () => {
    setShowViewEpicModal(false);
    setViewingEpic(null);
    setIsEditingEpic(false);
    setEditingEpic(null);
  };

  const startEditingEpic = () => {
    if (viewingEpic) {
      setEditingEpic({ ...viewingEpic });
      setIsEditingEpic(true);
      // Initialize user stories for edit mode
      setEditModeUserStories(viewingEpic.userStories ? [...viewingEpic.userStories] : []);
    }
  };

  const cancelEditingEpic = () => {
    setIsEditingEpic(false);
    setEditingEpic(null);
    setEditModeUserStories([]);
    setShowEditStoryForm(false);
    setEditModeStoryIndex(null);
  };

  const updateEditingEpic = (field: keyof Epic, value: string) => {
    if (!editingEpic) return;
    setEditingEpic(prev => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  // User Story Management Functions
  const addEditModeUserStory = useCallback(() => {
    if (editModeNewUserStory.title.trim()) {
      const storyToAdd: UserStory = {
        ...editModeNewUserStory,
        id: Date.now(),
        displayOrder: editModeUserStories.length
      };

      setEditModeUserStories([...editModeUserStories, storyToAdd]);

      // Reset form
      setEditModeNewUserStory({
        title: '',
        description: '',
        acceptanceCriteria: '',
        priority: 'Medium' as const,
        storyPoints: undefined,
        status: 'Draft' as const,
        displayOrder: 0
      });

      setShowEditStoryForm(false);
      setEditModeStoryIndex(null);

      if (editModeStoryEditorRef.current) {
        editModeStoryEditorRef.current.innerHTML = '';
      }
    }
  }, [editModeNewUserStory, editModeUserStories]);

  const updateEditModeUserStoryField = useCallback((field: keyof UserStory, value: any) => {
    setEditModeNewUserStory(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const editEditModeUserStory = useCallback((index: number) => {
    const story = editModeUserStories[index];
    setEditModeNewUserStory(story);
    setEditModeStoryIndex(index);
    setShowEditStoryForm(true);

    if (editModeStoryEditorRef.current && story.description) {
      editModeStoryEditorRef.current.innerHTML = story.description;
    }
  }, [editModeUserStories]);

  const updateEditModeEditingUserStory = useCallback(() => {
    if (editModeStoryIndex !== null && editModeNewUserStory.title.trim()) {
      const updatedStories = [...editModeUserStories];
      updatedStories[editModeStoryIndex] = {
        ...editModeNewUserStory,
        id: editModeUserStories[editModeStoryIndex].id
      };
      setEditModeUserStories(updatedStories);

      setEditModeNewUserStory({
        title: '',
        description: '',
        acceptanceCriteria: '',
        priority: 'Medium' as const,
        storyPoints: undefined,
        status: 'Draft' as const,
        displayOrder: 0
      });

      setEditModeStoryIndex(null);
      setShowEditStoryForm(false);

      if (editModeStoryEditorRef.current) {
        editModeStoryEditorRef.current.innerHTML = '';
      }
    }
  }, [editModeStoryIndex, editModeNewUserStory, editModeUserStories]);

  const removeEditModeUserStory = useCallback((index: number) => {
    setEditModeUserStories(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleEditModeStoryRichTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    updateEditModeUserStoryField('description', content);
  };

  const toggleEditModeStoryExpansion = useCallback((index: number) => {
    setEditModeExpandedStories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const saveEditedEpic = async () => {
    if (!editingEpic || !editingEpic.name.trim()) {
      return;
    }

    try {
      setSavingEpic(true);

      // Update epic with user stories
      const epicToSave = {
        ...editingEpic,
        userStories: editModeUserStories
      };

      // Handle user story deletions
      // Find stories that were removed (exist in original but not in current)
      const originalStories = viewingEpic?.userStories || [];
      const currentStoryIds = new Set(editModeUserStories.map(s => s.id).filter(id => id));
      const deletedStories = originalStories.filter(story => story.id && !currentStoryIds.has(story.id));

      // Delete removed stories
      if (deletedStories.length > 0) {
        try {
          for (const story of deletedStories) {
            if (story.id) {
              await fetch(
                `${API_BASE_URL}/v3/products/${product?.productId}/user-stories/${story.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                }
              );
            }
          }
        } catch (deleteError) {
          console.warn('Error deleting user stories:', deleteError);
        }
      }

      // Update epic using PUT endpoint (safe for single epic updates)
      const response = await fetch(`${API_BASE_URL}/v3/products/${product?.productId}/backlog/${epicToSave.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(epicToSave)
      });

      if (response.ok) {
        const savedEpic = await response.json();

        // Update in availableEpics if it exists there
        const epicInBacklog = availableEpics.find(e => e.id === editingEpic.id);
        if (epicInBacklog) {
          const updatedEpics = availableEpics.map(epic =>
            epic.id === savedEpic.id ? { ...epicToSave, ...savedEpic } : epic
          );
          setAvailableEpics(updatedEpics);
        }
      } else {
        throw new Error('Failed to update epic');
      }

      // Update roadmap item name
      if (roadmapData) {
        const updatedRoadmapItems = roadmapData.roadmapItems.map(item =>
          item.epicId === editingEpic.id
            ? { ...item, epicName: editingEpic.name, epicDescription: editingEpic.description }
            : item
        );

        // Save updated roadmap
        const response = await fetch(`${API_BASE_URL}/v2/products/${product?.productId}/roadmap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            year: selectedYear,
            quarter: selectedQuarter,
            roadmapItems: updatedRoadmapItems.map(item => {
              const { published, ...itemWithoutPublished } = item;
              return itemWithoutPublished;
            })
          })
        });

        if (response.ok) {
          setRoadmapData({ ...roadmapData, roadmapItems: updatedRoadmapItems });
          setViewingEpic(epicToSave);
          setIsEditingEpic(false);
          setEditingEpic(null);
          setEditModeUserStories([]);
          setShowEditStoryForm(false);
        } else {
          throw new Error('Failed to update roadmap');
        }
      }
    } catch (error) {
      setError('Failed to update epic');
    } finally {
      setSavingEpic(false);
    }
  };

  const StarRating: React.FC<{
    value: number;
    onChange?: (value: number) => void;
    readOnly?: boolean;
  }> = React.memo(({ value, onChange, readOnly = false }) => {
    const [hoverValue, setHoverValue] = useState(0);

    const handleClick = (rating: number) => {
      if (!readOnly && onChange) {
        onChange(rating);
      }
    };

    const handleMouseEnter = (rating: number) => {
      if (!readOnly) {
        setHoverValue(rating);
      }
    };

    const handleMouseLeave = () => {
      if (!readOnly) {
        setHoverValue(0);
      }
    };

    if (readOnly) {
      return (
        <div className="star-rating-display">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`material-icons star-display ${star <= value ? '' : 'empty'}`}
            >
              star
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="star-rating" data-readonly={readOnly}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`material-icons star ${
              star <= (hoverValue || value) ? 'filled' : ''
            }`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
          >
            star
          </span>
        ))}
      </div>
    );
  });

  if (loading || productLoading) {
    return (
      <div className="roadmap-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading roadmap...</p>
        </div>
      </div>
    );
  }

  if (error || productError) {
    return (
      <div className="roadmap-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error || productError}</p>
          <div className="error-actions">
            <button onClick={() => setError('')} className="btn btn-secondary">
              <span className="material-icons">refresh</span>
              Try Again
            </button>
            <button onClick={() => navigate(`/products/${productSlug}/modules`)} className="btn btn-primary">
              <span className="material-icons">arrow_back</span>
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="roadmap-container">
      <div className="roadmap-planner-page-header">
        <div className="header-top-row">
          <div className="header-left">
            <button 
              onClick={() => navigate(`/products/${productSlug}/modules`)} 
              className="back-button"
              aria-label="Back to modules"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            <h1 className="roadmap-planner-page-title">Roadmap Planner</h1>
          </div>
          
          <div className="quarter-selector">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="year-select"
            >
              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              className="quarter-select"
            >
              <option value={1}>Q1 (Jan-Mar)</option>
              <option value={2}>Q2 (Apr-Jun)</option>
              <option value={3}>Q3 (Jul-Sep)</option>
              <option value={4}>Q4 (Oct-Dec)</option>
            </select>
          </div>

          <div className="header-actions">
            {!isEditMode ? (
              <button
                onClick={() => setIsEditMode(true)}
                className="edit-mode-btn"
              >
                <span className="material-icons">edit</span>
                Edit
              </button>
            ) : (
              <div className="edit-mode-controls">
                <button
                  onClick={() => {
                    loadAssignedEpicIds();
                    // Pre-populate selectedEpics with epics already in current quarter
                    const currentQuarterEpicIds = roadmapData?.roadmapItems?.map(item => item.epicId) || [];
                    setSelectedEpics(new Set(currentQuarterEpicIds));
                    setIsEditMode(false); // Ensure we're not in edit mode when adding epics
                    setShowEpicModal(true);
                  }}
                  className="add-epic-btn"
                >
                  <span className="material-icons">add</span>
                  Add/Remove Epics
                </button>
                <div className="edit-actions-row">
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setHasUnsavedChanges(false); // Reset unsaved changes flag
                      loadRoadmapData(); // Reload to discard unsaved changes
                    }}
                    className="cancel-edit-btn icon-only"
                    title="Cancel changes"
                    aria-label="Cancel changes"
                  >
                    <span className="material-icons">close</span>
                  </button>
                  <button
                    onClick={() => {
                      saveRoadmap();
                      setIsEditMode(false);
                    }}
                    className="save-btn icon-only"
                    title="Save changes"
                    aria-label="Save changes"
                  >
                    <span className="material-icons">save</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="roadmap-content">
        {inlineError && !loading && (
          <div className="inline-error-banner">
            <div className="error-content">
              <span className="material-icons error-icon">warning</span>
              <span className="error-message">{inlineError}</span>
            </div>
            <button 
              onClick={() => setInlineError('')} 
              className="error-dismiss"
              aria-label="Dismiss error"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        )}
        
        {successMessage && !loading && (
          <div className="inline-success-banner">
            <div className="success-content">
              <span className="material-icons success-icon">check_circle</span>
              <span className="success-message">{successMessage}</span>
            </div>
            <button 
              onClick={() => setSuccessMessage('')} 
              className="success-dismiss"
              aria-label="Dismiss success message"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        )}
        
        <div className="quarter-info">
          <div className="quarter-header">
            <span className="material-icons quarter-icon">timeline</span>
            <div className="quarter-details">
              <h2>Q{selectedQuarter} {selectedYear} Roadmap</h2>
              <p>{roadmapData?.roadmapItems?.length || 0} items planned</p>
            </div>
          </div>
        </div>

        {isEditMode && (
          <div className="edit-mode-banner">
            <div className="edit-mode-info">
              <span className="material-icons">edit</span>
              <span>Edit Mode - You can modify scores, status, and priority</span>
              {hasUnsavedChanges && (
                <span className="unsaved-indicator" style={{
                  marginLeft: '10px',
                  color: '#e74c3c',
                  fontWeight: 'bold'
                }}>
                  (Unsaved changes)
                </span>
              )}
            </div>
          </div>
        )}

        <div className="roadmap-items">
          {roadmapData?.roadmapItems?.length === 0 ? (
            <div className="empty-roadmap">
              <span className="material-icons">timeline</span>
              <h3>No items in roadmap</h3>
              <p>Enter edit mode to add epics from your backlog and start planning this quarter.</p>
            </div>
          ) : (
            <div className="roadmap-table-container">
              <table className="roadmap-table">
                <thead>
                  <tr>
                    <th className="col-epic">Epic</th>
                    <th className="col-initiative">Initiative</th>
                    <th className="col-theme">Theme</th>
                    <th className="col-track">Track</th>
                    <th className="col-reach">Reach</th>
                    <th className="col-impact">Impact</th>
                    <th className="col-confidence">Confidence</th>
                    <th className="col-effort-rating">Estimated Effort</th>
                    <th className="col-rice-score">RICE Score</th>
                    <th className="col-start-date">Start Date</th>
                    <th className="col-end-date">End Date</th>
                    <th className="col-status">Status</th>
                    <th className="col-priority">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {roadmapData?.roadmapItems?.map((item) => {
                    const epic = availableEpics.find(e => e.id === item.epicId);
                    return (
                    <tr key={item.epicId} className="roadmap-row">
                      <td className="col-epic">
                        <div className="epic-cell">
                          <button
                            className="epic-name-btn"
                            onClick={() => openViewEpicModal(item.epicId)}
                            title="View epic details"
                          >
                            {item.epicName}
                          </button>
                        </div>
                      </td>
                      <td className="col-initiative">
                        <span className="initiative-display">{item.initiativeName || '-'}</span>
                      </td>
                      <td className="col-theme">
                        <span className="theme-display">{item.themeName || '-'}</span>
                      </td>
                      <td className="col-track">
                        <span className="track-display">{item.track || '-'}</span>
                      </td>
                      <td className="col-reach">
                        <StarRating
                          value={item.reach || 0}
                          onChange={isEditMode ? (value) => updateRoadmapItem(item.epicId, 'reach', value) : undefined}
                          readOnly={!isEditMode}
                        />
                      </td>
                      <td className="col-impact">
                        <StarRating
                          value={item.impact || 0}
                          onChange={isEditMode ? (value) => updateRoadmapItem(item.epicId, 'impact', value) : undefined}
                          readOnly={!isEditMode}
                        />
                      </td>
                      <td className="col-confidence">
                        <StarRating
                          value={item.confidence || 0}
                          onChange={isEditMode ? (value) => updateRoadmapItem(item.epicId, 'confidence', value) : undefined}
                          readOnly={!isEditMode}
                        />
                      </td>
                      <td className="col-effort-rating">
                        <StarRating
                          value={item.effortRating || 0}
                          readOnly={true}
                        />
                      </td>
                      <td className="col-rice-score">
                        <span className="rice-score-display">
                          {item.reach && item.impact && item.confidence && item.effortRating
                            ? ((item.impact * item.confidence * item.reach) / item.effortRating).toFixed(1)
                            : '-'
                          }
                        </span>
                      </td>
                      <td className="col-start-date">
                        {isEditMode ? (
                          <input
                            type="date"
                            value={item.startDate || getQuarterStartDate(selectedYear, selectedQuarter)}
                            onChange={(e) => updateRoadmapItem(item.epicId, 'startDate', e.target.value)}
                            className="date-input"
                          />
                        ) : (
                          <span className="date-display">
                            {item.startDate 
                              ? new Date(item.startDate).toLocaleDateString()
                              : new Date(getQuarterStartDate(selectedYear, selectedQuarter)).toLocaleDateString()
                            }
                          </span>
                        )}
                      </td>
                      <td className="col-end-date">
                        {isEditMode ? (
                          <input
                            type="date"
                            value={item.endDate || getQuarterEndDate(selectedYear, selectedQuarter)}
                            onChange={(e) => updateRoadmapItem(item.epicId, 'endDate', e.target.value)}
                            className="date-input"
                          />
                        ) : (
                          <span className="date-display">
                            {item.endDate 
                              ? new Date(item.endDate).toLocaleDateString()
                              : new Date(getQuarterEndDate(selectedYear, selectedQuarter)).toLocaleDateString()
                            }
                          </span>
                        )}
                      </td>
                      <td className="col-status">
                        {isEditMode ? (
                          <select
                            value={item.status}
                            onChange={(e) => updateRoadmapItem(item.epicId, 'status', e.target.value)}
                            className="status-select-table"
                          >
                            <option value="Proposed">Proposed</option>
                            <option value="Committed">Committed</option>
                            <option value="To-Do">To-Do</option>
                            <option value="In-Progress">In-Progress</option>
                            <option value="Done">Done</option>
                          </select>
                        ) : (
                          <span className={`status-badge ${item.status.toLowerCase().replace(' ', '-')}`}>
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="col-priority">
                        {isEditMode ? (
                          <select
                            value={item.priority}
                            onChange={(e) => updateRoadmapItem(item.epicId, 'priority', e.target.value)}
                            className="priority-select-table"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        ) : (
                          <span className={`priority-badge ${item.priority.toLowerCase()}`}>{item.priority}</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Publish Section - only show when not in edit mode and items exist */}
          {!isEditMode && roadmapData?.roadmapItems && roadmapData.roadmapItems.length > 0 && (
            <div className="roadmap-publish-section">
              <div className="publish-info">
                <span className="material-icons">publish</span>
                <div className="publish-text">
                  <h3>Ready to publish this quarter?</h3>
                  <p>Committed items will move to Roadmap Visualization. Proposed items will be removed.</p>
                </div>
              </div>
              <button
                onClick={() => handlePublishQuarter()}
                className="publish-btn"
              >
                <span className="material-icons">publish</span>
                Publish Q{selectedQuarter} {selectedYear}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Epic Selection Modal */}
      {showEpicModal && (
        <div className="modal-overlay">
          <div className="modal-content epic-selection-modal">
            <div className="modal-header">
              <h3>Select Epics for Q{selectedQuarter} {selectedYear}</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowEpicModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="epic-filters">
                <div className="filter-controls">
                  <div className="search-bar">
                    <div className="search-input-wrapper">
                      <span className="material-icons search-icon">search</span>
                      <input
                        type="text"
                        placeholder="Search epics..."
                        value={epicSearchTerm}
                        onChange={(e) => setEpicSearchTerm(e.target.value)}
                        className="search-input"
                      />
                    </div>
                  </div>
                  
                  <select
                    value={selectedThemeFilter}
                    onChange={(e) => setSelectedThemeFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Themes</option>
                    {uniqueThemes.map(theme => (
                      <option key={theme} value={theme}>{theme}</option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedInitiativeFilter}
                    onChange={(e) => setSelectedInitiativeFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Initiatives</option>
                    {uniqueInitiatives.map(initiative => (
                      <option key={initiative} value={initiative}>{initiative}</option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedTrackFilter}
                    onChange={(e) => setSelectedTrackFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Tracks</option>
                    {uniqueTracks.map(track => (
                      <option key={track} value={track}>{track}</option>
                    ))}
                  </select>
                  
                  {(epicSearchTerm || selectedThemeFilter || selectedInitiativeFilter || selectedTrackFilter) && (
                    <button
                      onClick={clearEpicFilters}
                      className="clear-epic-filters-btn"
                      title="Clear all filters"
                    >
                      <span className="material-icons">refresh</span>
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="epic-selection-summary">
                <span className="epic-count">
                  {filteredAvailableEpics.length} available
                  {assignedEpicIds.size > 0 && (
                    <span className="epic-info"> ({assignedEpicIds.size} in other quarters)</span>
                  )}
                </span>
                <span className="epic-separator">•</span>
                <span className="selected-count">{selectedEpics.size} selected</span>
              </div>
              
              <div className="epic-selection-list">
                {filteredAvailableEpics.length === 0 ? (
                  <div className="no-epics-message">
                    No epics available. Available epics count: {availableEpics.length}, 
                    Assigned epics: {assignedEpicIds.size}
                  </div>
                ) : (
                  filteredAvailableEpics.map(epic => (
                    <div 
                    key={epic.id} 
                    className={`epic-selection-item ${selectedEpics.has(epic.id) ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleEpicSelection(epic.id);
                    }}
                  >
                    <div className="epic-checkbox-label">
                      <div className="epic-info">
                        <h4 className="epic-name">{epic.name}</h4>
                        <div className="epic-meta">
                          <span className="epic-initiative">{epic.initiativeName}</span>
                          <span className="epic-theme">{epic.themeName}</span>
                          <span className="epic-track">{epic.track}</span>
                        </div>
                      </div>
                    </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => setShowEpicModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm"
                onClick={saveRoadmap}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishModal && <PublishConfirmationModal />}

      {/* View/Edit Epic Modal */}
      {showViewEpicModal && viewingEpic && (
        <div className="product-backlog-modal-overlay" onClick={closeViewEpicModal}>
          <div className="product-backlog-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="product-backlog-modal-header">
              <h2>{isEditingEpic ? 'Edit Epic' : 'Epic Details'}</h2>
              <button className="product-backlog-modal-close-btn" onClick={closeViewEpicModal}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="product-backlog-modal-body">
              <div className="epic-form">
                <div className="form-row-three">
                  <div className="form-group">
                    <label>Theme</label>
                    <div className="view-field">{viewingEpic.themeName || '-'}</div>
                  </div>
                  <div className="form-group">
                    <label>Initiative</label>
                    <div className="view-field">{viewingEpic.initiativeName || '-'}</div>
                  </div>
                  <div className="form-group">
                    <label>Track</label>
                    <div className="view-field">{viewingEpic.track || '-'}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Epic Name{isEditingEpic && ' *'}</label>
                  {isEditingEpic && editingEpic ? (
                    <input
                      type="text"
                      value={editingEpic.name}
                      onChange={(e) => updateEditingEpic('name', e.target.value)}
                      className="epic-name-input"
                      placeholder="Enter epic name"
                    />
                  ) : (
                    <div className="view-field epic-name-view">
                      {viewingEpic.name}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <div className="view-field epic-description-view">
                    {viewingEpic.description ? (
                      <div dangerouslySetInnerHTML={{ __html: viewingEpic.description }} />
                    ) : (
                      'No description provided'
                    )}
                  </div>
                </div>

                {/* User Stories Section */}
                {isEditingEpic ? (
                  <div className="form-group">
                    <label>
                      User Stories (Optional)
                      {editModeUserStories.length > 0 && (
                        <span className="story-count-badge">{editModeUserStories.length}</span>
                      )}
                    </label>
                    {!showEditStoryForm && (
                      <button
                        type="button"
                        onClick={() => setShowEditStoryForm(true)}
                        className="add-story-btn"
                      >
                        <span className="material-icons">add</span>
                        Add User Story
                      </button>
                    )}

                    {showEditStoryForm && (
                      <div className="user-story-form">
                        <div className="story-form-row">
                          <input
                            type="text"
                            value={editModeNewUserStory.title}
                            onChange={(e) => updateEditModeUserStoryField('title', e.target.value)}
                            placeholder="User story title *"
                            className="story-title-input"
                          />
                          <select
                            value={editModeNewUserStory.priority}
                            onChange={(e) => updateEditModeUserStoryField('priority', e.target.value)}
                            className="story-priority-select"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                          <input
                            type="number"
                            value={editModeNewUserStory.storyPoints || ''}
                            onChange={(e) => updateEditModeUserStoryField('storyPoints', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="Points"
                            className="story-points-input"
                            min="1"
                            max="100"
                          />
                        </div>

                        <div className="story-form-group">
                          <label>Description</label>
                          <div className="rich-text-editor story-editor">
                            <div className="rich-text-toolbar">
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
                            </div>
                            <div
                              ref={editModeStoryEditorRef}
                              contentEditable
                              className="story-description-editor"
                              onInput={handleEditModeStoryRichTextChange}
                              data-placeholder="Story description (optional)"
                              suppressContentEditableWarning={true}
                            />
                          </div>
                        </div>

                        <div className="story-form-group">
                          <label>Acceptance Criteria</label>
                          <textarea
                            value={editModeNewUserStory.acceptanceCriteria}
                            onChange={(e) => updateEditModeUserStoryField('acceptanceCriteria', e.target.value)}
                            placeholder="Define the acceptance criteria for this story..."
                            className="story-acceptance-input"
                            rows={3}
                          />
                        </div>

                        <div className="story-form-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditStoryForm(false);
                              setEditModeStoryIndex(null);
                              setEditModeNewUserStory({
                                title: '',
                                description: '',
                                acceptanceCriteria: '',
                                priority: 'Medium' as const,
                                storyPoints: undefined,
                                status: 'Draft' as const,
                                displayOrder: 0
                              });
                              if (editModeStoryEditorRef.current) {
                                editModeStoryEditorRef.current.innerHTML = '';
                              }
                            }}
                            className="story-cancel-btn"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={editModeStoryIndex !== null ? updateEditModeEditingUserStory : addEditModeUserStory}
                            className="story-save-btn"
                          >
                            {editModeStoryIndex !== null ? 'Update' : 'Add'} Story
                          </button>
                        </div>
                      </div>
                    )}

                    {editModeUserStories.length > 0 && (
                      <div className="user-stories-list">
                        {editModeUserStories.map((story, index) => (
                          <div key={story.id} className="user-story-item">
                            <div className="story-item-header">
                              <div className="story-item-left">
                                <button
                                  type="button"
                                  onClick={() => toggleEditModeStoryExpansion(index)}
                                  className="story-expand-btn"
                                >
                                  <span className="material-icons">
                                    {editModeExpandedStories.has(index) ? 'expand_less' : 'expand_more'}
                                  </span>
                                </button>
                                <span className="story-title">{story.title}</span>
                                {story.priority && (
                                  <span className={`story-priority-badge priority-${story.priority.toLowerCase()}`}>
                                    {story.priority}
                                  </span>
                                )}
                                {story.storyPoints && (
                                  <span className="story-points-badge">
                                    {story.storyPoints} pts
                                  </span>
                                )}
                              </div>
                              <div className="story-item-actions">
                                <button
                                  type="button"
                                  onClick={() => editEditModeUserStory(index)}
                                  className="story-edit-btn"
                                  title="Edit story"
                                >
                                  <span className="material-icons">edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEditModeUserStory(index)}
                                  className="story-delete-btn"
                                  title="Delete story"
                                >
                                  <span className="material-icons">delete</span>
                                </button>
                              </div>
                            </div>
                            {editModeExpandedStories.has(index) && (
                              <div className="story-item-details">
                                {story.description && (
                                  <div className="story-detail-section">
                                    <strong>Description:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: story.description }} />
                                  </div>
                                )}
                                {story.acceptanceCriteria && (
                                  <div className="story-detail-section">
                                    <strong>Acceptance Criteria:</strong>
                                    <p>{story.acceptanceCriteria}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  viewingEpic.userStories && viewingEpic.userStories.length > 0 && (
                    <div className="form-group">
                      <label>User Stories ({viewingEpic.userStories.length})</label>
                      <div className="user-stories-list">
                        {viewingEpic.userStories.map((story, index) => (
                          <div key={story.id} className="user-story-item view-only">
                            <div className="story-item-header">
                              <div className="story-item-left">
                                <span className="story-title">{story.title}</span>
                                {story.priority && (
                                  <span className={`story-priority-badge priority-${story.priority.toLowerCase()}`}>
                                    {story.priority}
                                  </span>
                                )}
                                {story.storyPoints && (
                                  <span className="story-points-badge">
                                    {story.storyPoints} pts
                                  </span>
                                )}
                              </div>
                            </div>
                            {story.description && (
                              <div className="story-item-details">
                                <div className="story-detail-section">
                                  <div dangerouslySetInnerHTML={{ __html: story.description }} />
                                </div>
                              </div>
                            )}
                            {story.acceptanceCriteria && (
                              <div className="story-item-details">
                                <div className="story-detail-section">
                                  <strong>Acceptance Criteria:</strong>
                                  <p>{story.acceptanceCriteria}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="product-backlog-modal-footer">
              {isEditingEpic ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={cancelEditingEpic} className="btn-cancel" disabled={savingEpic}>
                    <span className="material-icons">close</span>
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedEpic}
                    className="modal-btn-primary"
                    disabled={savingEpic || !editingEpic?.name.trim()}
                  >
                    <span className="material-icons">{savingEpic ? 'hourglass_empty' : 'save'}</span>
                    {savingEpic ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={closeViewEpicModal} className="btn-close">
                    <span className="material-icons">check</span>
                    Close
                  </button>
                  <button onClick={startEditingEpic} className="modal-btn-primary">
                    <span className="material-icons">edit</span>
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(RoadmapPlanner);