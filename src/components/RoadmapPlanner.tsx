import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import { API_BASE_URL } from '../config';
import './RoadmapPlanner.css';

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
      const response = await fetch(`${API_BASE_URL}/v3/products/${product.productId}/backlog`, {
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
        await loadRoadmapData();
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
                          <h4 className="epic-title">{item.epicName}</h4>
                        </div>
                      </td>
                      <td className="col-initiative">
                        <span className="initiative-display">{epic?.initiativeName || '-'}</span>
                      </td>
                      <td className="col-theme">
                        <span className="theme-display">{epic?.themeName || '-'}</span>
                      </td>
                      <td className="col-track">
                        <span className="track-display">{epic?.track || '-'}</span>
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
    </div>
  );
};

export default React.memo(RoadmapPlanner);