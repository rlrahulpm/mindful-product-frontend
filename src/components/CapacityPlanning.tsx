import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProduct';
import './CapacityPlanning.css';

interface Team {
  id: number;
  name: string;
  description: string;
  productId: number;
  isActive: boolean;
}

interface EpicEffort {
  id?: number;
  capacityPlanId?: number;
  epicId: string;
  epicName: string;
  teamId: number;
  teamName?: string;
  effortDays: number;
  notes?: string;
}

interface EffortRatingConfig {
  id?: number;
  productId: number;
  unitType: string;
  star1Max: number;
  star2Min: number;
  star2Max: number;
  star3Min: number;
  star3Max: number;
  star4Min: number;
  star4Max: number;
  star5Min: number;
}

type EffortUnit = 'SPRINTS' | 'DAYS';

interface Epic {
  epicId: string;
  epicName: string;
  efforts: EpicEffort[];
}

interface CapacityPlan {
  id?: number;
  productId: number;
  year: number;
  quarter: number;
  effortUnit?: string;
  teams: Team[];
  epicEfforts: EpicEffort[];
}

const CapacityPlanning: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { product, loading: productLoading, error: productError } = useProduct(productSlug);
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [effortUnit, setEffortUnit] = useState<EffortUnit>('SPRINTS');
  const [capacityPlan, setCapacityPlan] = useState<CapacityPlan | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [effortRatingConfigs, setEffortRatingConfigs] = useState<EffortRatingConfig[]>([]);
  const [editingRatingConfig, setEditingRatingConfig] = useState<EffortRatingConfig | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Lock/unlock body scroll when modals are open
  useEffect(() => {
    const isAnyModalOpen = showSettingsModal || showTeamModal || editingRatingConfig !== null;
    
    if (isAnyModalOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift
    } else {
      // Unlock body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [showSettingsModal, showTeamModal, editingRatingConfig]);

  useEffect(() => {
    if (product) {
      loadCapacityPlan();
      loadTeams();
      loadEffortRatingConfigs();
    }
  }, [product, selectedYear, selectedQuarter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTeams = async () => {
    if (!product) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/products/${product.productId}/capacity-planning/teams`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const teamsData = await response.json();
        setTeams(teamsData);
      } else {
        throw new Error('Failed to load teams');
      }
    } catch (err: any) {
      setError('Failed to load teams');
    }
  };

  const loadEffortRatingConfigs = async () => {
    if (!product) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/products/${product.productId}/capacity-planning/effort-rating-configs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const configs = await response.json();
        setEffortRatingConfigs(configs);
      } else {
        throw new Error('Failed to load effort rating configs');
      }
    } catch (err: any) {
    }
  };

  const loadCapacityPlan = async () => {
    if (!product) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8080/api/products/${product.productId}/capacity-planning/${selectedYear}/${selectedQuarter}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCapacityPlan(data);
        
        // Set the effort unit from the response, default to SPRINTS if not present
        if (data.effortUnit) {
          setEffortUnit(data.effortUnit as EffortUnit);
        }
        
        // Group epic efforts by epic
        const epicGroups: { [key: string]: Epic } = {};
        
        data.epicEfforts?.forEach((effort: EpicEffort) => {
          if (!epicGroups[effort.epicId]) {
            epicGroups[effort.epicId] = {
              epicId: effort.epicId,
              epicName: effort.epicName,
              efforts: []
            };
          }
          epicGroups[effort.epicId].efforts.push(effort);
        });
        
        // Ensure all epics have efforts for all teams
        const epicsWithAllTeams = Object.values(epicGroups).map(epic => {
          const updatedEfforts = [...epic.efforts];
          
          // Add missing team efforts
          teams.forEach(team => {
            if (!updatedEfforts.find(e => e.teamId === team.id)) {
              updatedEfforts.push({
                id: 0,
                epicId: epic.epicId,
                epicName: epic.epicName,
                teamId: team.id,
                teamName: team.name,
                effortDays: 0,
                notes: ''
              });
            }
          });
          
          return { ...epic, efforts: updatedEfforts };
        });
        
        setEpics(epicsWithAllTeams);
      } else if (response.status === 404) {
        // No capacity plan exists for this quarter yet
        setCapacityPlan({
          productId: product.productId,
          year: selectedYear,
          quarter: selectedQuarter,
          teams: [],
          epicEfforts: []
        });
        setEpics([]);
      } else {
        throw new Error('Failed to load capacity plan');
      }
    } catch (err: any) {
      setError('Failed to load capacity plan');
    } finally {
      setLoading(false);
    }
  };

  const addTeam = async () => {
    if (!product || !newTeam.name.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/products/${product.productId}/capacity-planning/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newTeam.name.trim(),
          description: newTeam.description.trim(),
          isActive: true
        })
      });

      if (response.ok) {
        setNewTeam({ name: '', description: '' });
        setShowTeamModal(false);
        const newTeamData = await response.json();
        await loadTeams();
        
        // Add the new team to all existing epics
        setEpics(prevEpics => 
          prevEpics.map(epic => ({
            ...epic,
            efforts: [...epic.efforts, {
              id: 0,
              epicId: epic.epicId,
              epicName: epic.epicName,
              teamId: newTeamData.id,
              teamName: newTeamData.name,
              effortDays: 0,
              notes: ''
            }]
          }))
        );
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to add team');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add team');
    }
  };

  const removeTeam = async (teamId: number) => {
    if (!product || !window.confirm('Are you sure you want to remove this team?')) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/products/${product.productId}/capacity-planning/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadTeams();
        await loadCapacityPlan(); // Reload to get updated epic efforts
      } else {
        throw new Error('Failed to remove team');
      }
    } catch (err: any) {
      setError('Failed to remove team');
    }
  };

  const updateEffort = (epicId: string, teamId: number, effortDays: number) => {
    setEpics(prevEpics => 
      prevEpics.map(epic => {
        if (epic.epicId === epicId) {
          // Check if effort exists for this team
          const existingEffortIndex = epic.efforts.findIndex(e => e.teamId === teamId);
          
          if (existingEffortIndex >= 0) {
            // Update existing effort
            return {
              ...epic,
              efforts: epic.efforts.map(effort => 
                effort.teamId === teamId 
                  ? { ...effort, effortDays }
                  : effort
              )
            };
          } else {
            // Create new effort entry for this team
            const team = teams.find(t => t.id === teamId);
            if (team) {
              return {
                ...epic,
                efforts: [...epic.efforts, {
                  id: 0, // Will be assigned by backend
                  epicId: epicId,
                  epicName: epic.epicName,
                  teamId: teamId,
                  teamName: team.name,
                  effortDays: effortDays,
                  notes: ''
                }]
              };
            }
          }
        }
        return epic;
      })
    );
  };

  const updateNotes = (epicId: string, teamId: number, notes: string) => {
    setEpics(prevEpics => 
      prevEpics.map(epic => {
        if (epic.epicId === epicId) {
          return {
            ...epic,
            efforts: epic.efforts.map(effort => 
              effort.teamId === teamId 
                ? { ...effort, notes }
                : effort
            )
          };
        }
        return epic;
      })
    );
  };

  const autoFillEffortRatingsAfterSave = async () => {
    
    if (!product || !capacityPlan || epics.length === 0) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Get the effort rating config for the current unit type
      const config = effortRatingConfigs.find(c => c.unitType === effortUnit);
      
      if (!config) {
        setError(`No effort rating configuration found for ${effortUnit}`);
        return;
      }
      
      // Calculate total effort for each epic and determine star rating
      const epicRatings: { [epicId: string]: { epicName: string; totalEffort: number; starRating: number } } = {};
      
      epics.forEach(epic => {
        const totalEffort = getTotalEffortForEpic(epic);
        let starRating = 1;
        
        if (totalEffort <= config.star1Max) {
          starRating = 1;
        } else if (totalEffort >= config.star2Min && totalEffort <= config.star2Max) {
          starRating = 2;
        } else if (totalEffort >= config.star3Min && totalEffort <= config.star3Max) {
          starRating = 3;
        } else if (totalEffort >= config.star4Min && totalEffort <= config.star4Max) {
          starRating = 4;
        } else if (totalEffort >= config.star5Min) {
          starRating = 5;
        } else {
          // Handle gaps in configuration
          if (totalEffort < config.star2Min) {
            starRating = 1;
          } else if (totalEffort < config.star3Min) {
            starRating = 2;
          } else if (totalEffort < config.star4Min) {
            starRating = 3;
          } else if (totalEffort < config.star5Min) {
            starRating = 4;
          } else {
            starRating = 5;
          }
        }
        
        epicRatings[epic.epicId] = {
          epicName: epic.epicName,
          totalEffort,
          starRating
        };
        
      });
      
      
      // Update roadmap planner with calculated star ratings
      const roadmapUpdatePromises = Object.entries(epicRatings).map(async ([epicId, rating]) => {
        try {
          const url = `http://localhost:8080/api/products/${product.productId}/roadmap/${selectedYear}/${selectedQuarter}/epics/${epicId}/effort-rating`;
          
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              effortRating: rating.starRating
            })
          });
          
          if (!response.ok) {
          }
        } catch (err) {
        }
      });
      
      await Promise.all(roadmapUpdatePromises);
      
      // Log success message (no alert needed since this happens automatically)
      const successMessage = `Auto-filled effort ratings for ${Object.keys(epicRatings).length} epics based on capacity planning totals`;
      
    } catch (err: any) {
      setError('Failed to auto-fill effort ratings');
    } finally {
      setSaving(false);
    }
  };

  const saveCapacityPlan = async () => {
    if (!product || !capacityPlan) return;
    
    try {
      setSaving(true);
      
      // Flatten all epic efforts
      const allEfforts: EpicEffort[] = [];
      epics.forEach(epic => {
        epic.efforts.forEach(effort => {
          allEfforts.push({
            epicId: effort.epicId,
            epicName: effort.epicName,
            teamId: effort.teamId,
            effortDays: effort.effortDays,
            notes: effort.notes
          });
        });
      });

      const response = await fetch(
        `http://localhost:8080/api/products/${product.productId}/capacity-planning/${selectedYear}/${selectedQuarter}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            year: selectedYear,
            quarter: selectedQuarter,
            effortUnit: effortUnit,
            epicEfforts: allEfforts
          })
        }
      );

      if (response.ok) {
        setIsEditMode(false);
        await loadCapacityPlan(); // Reload to get updated data
        
        // Auto-fill effort ratings after saving capacity plan
        await autoFillEffortRatingsAfterSave();
      } else {
        throw new Error('Failed to save capacity plan');
      }
    } catch (err: any) {
      setError('Failed to save capacity plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading || productLoading) {
    return (
      <div className="capacity-planning-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading capacity planning...</p>
        </div>
      </div>
    );
  }

  if (error || productError) {
    return (
      <div className="capacity-planning-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error || productError}</p>
          <button onClick={() => navigate(`/products/${productSlug}/modules`)} className="btn btn-primary">
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  const getTeamName = (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getTotalEffortForEpic = (epic: Epic) => {
    return epic.efforts.reduce((total, effort) => total + effort.effortDays, 0);
  };

  const getTotalEffortForTeam = (teamId: number) => {
    return epics.reduce((total, epic) => {
      const effort = epic.efforts.find(e => e.teamId === teamId);
      return total + (effort?.effortDays || 0);
    }, 0);
  };

  const updateEffortRatingConfig = async (config: EffortRatingConfig) => {
    if (!product) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/products/${product.productId}/capacity-planning/effort-rating-configs/${config.unitType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          unitType: config.unitType,
          star1Max: config.star1Max,
          star2Min: config.star2Min,
          star2Max: config.star2Max,
          star3Min: config.star3Min,
          star3Max: config.star3Max,
          star4Min: config.star4Min,
          star4Max: config.star4Max,
          star5Min: config.star5Min
        })
      });

      if (response.ok) {
        await loadEffortRatingConfigs();
        setEditingRatingConfig(null);
      } else {
        throw new Error('Failed to update effort rating config');
      }
    } catch (err: any) {
      setError('Failed to update effort rating config');
    }
  };


  return (
    <div className="capacity-planning-container">
      <div className="page-header">
        <div className="header-top-row">
          <div className="header-left">
            <button 
              onClick={() => navigate(`/products/${productSlug}/modules`)} 
              className="back-button"
              aria-label="Back to modules"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            <h1 className="page-title">Capacity Planning</h1>
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

          {!isEditMode ? (
            <button
              onClick={() => setIsEditMode(true)}
              className="edit-mode-btn"
            >
              <span className="material-icons">edit</span>
              Edit
            </button>
          ) : (
            <div className="edit-actions">
              <button
                onClick={() => setIsEditMode(false)}
                className="cancel-edit-btn"
              >
                Cancel
              </button>
              <button
                onClick={saveCapacityPlan}
                className="save-btn"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="capacity-content">
        {error && (
          <div className="error-banner">
            <span className="material-icons">error</span>
            <span>{error}</span>
            <button onClick={() => setError('')} className="error-dismiss">
              <span className="material-icons">close</span>
            </button>
          </div>
        )}

        <div className="capacity-header">
          <div className="capacity-info">
            <span className="material-icons capacity-icon">groups</span>
            <div className="capacity-details">
              <h2>Q{selectedQuarter} {selectedYear} Capacity Plan</h2>
              <p>{epics.length} epics • {teams.length} teams</p>
            </div>
          </div>

          <div className="capacity-actions">
            
            <button
              onClick={() => setShowSettingsModal(true)}
              className="settings-btn"
              title="Settings"
            >
              <span className="material-icons">settings</span>
            </button>
          </div>
        </div>

        {epics.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">timeline</span>
            <h3>No epics found for Q{selectedQuarter} {selectedYear}</h3>
            <p>Add epics to your roadmap planner first, then come back to allocate capacity.</p>
          </div>
        ) : (
          <div className="capacity-table-container">
            <table className="capacity-table">
              <thead>
                <tr>
                  <th className="col-epic">Epic</th>
                  {teams.map(team => (
                    <th key={team.id} className="col-team">
                      <div className="team-header">
                        <span className="team-name">{team.name}</span>
                        {isEditMode && (
                          <button
                            onClick={() => removeTeam(team.id)}
                            className="remove-team-btn"
                            title="Remove team"
                          >
                            <span className="material-icons">close</span>
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="col-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {epics.map(epic => (
                  <tr key={epic.epicId} className="epic-row">
                    <td className="epic-cell">
                      <div className="epic-info">
                        <h4 className="epic-name">{epic.epicName}</h4>
                      </div>
                    </td>
                    {teams.map(team => {
                      const effort = epic.efforts.find(e => e.teamId === team.id);
                      return (
                        <td key={team.id} className="effort-cell">
                          {isEditMode ? (
                            <div className="effort-input-group">
                              <input
                                type="number"
                                min="0"
                                value={effort?.effortDays || 0}
                                onChange={(e) => updateEffort(epic.epicId, team.id, parseInt(e.target.value) || 0)}
                                className="effort-input"
                                placeholder="0"
                              />
                              <span className="effort-unit">{effortUnit.toLowerCase()}</span>
                            </div>
                          ) : (
                            <div className="effort-display">
                              <span className="effort-days">{effort?.effortDays || 0}</span>
                              <span className="effort-unit">{effortUnit.toLowerCase()}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="total-cell">
                      <span className="total-effort">{getTotalEffortForEpic(epic)} {effortUnit.toLowerCase()}</span>
                    </td>
                  </tr>
                ))}
                <tr className="totals-row">
                  <td className="totals-label">
                    <strong>Team Totals</strong>
                  </td>
                  {teams.map(team => (
                    <td key={team.id} className="team-total-cell">
                      <strong>{getTotalEffortForTeam(team.id)} {effortUnit.toLowerCase()}</strong>
                    </td>
                  ))}
                  <td className="grand-total-cell">
                    <strong>
                      {epics.reduce((total, epic) => total + getTotalEffortForEpic(epic), 0)} {effortUnit.toLowerCase()}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Capacity Planning Settings</h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="modal-close-btn"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              {/* Team Management Section */}
              <div className="settings-section">
                <div className="section-header">
                  <h4>Teams</h4>
                  <button 
                    onClick={() => setShowTeamModal(true)}
                    className="add-team-inline-btn"
                  >
                    <span className="material-icons">add</span>
                    Add Team
                  </button>
                </div>
                <div className="teams-list">
                  {teams.length === 0 ? (
                    <p className="no-teams">No teams configured</p>
                  ) : (
                    teams.map(team => (
                      <div key={team.id} className="team-item">
                        <div className="team-info">
                          <span className="team-name">{team.name}</span>
                          {team.description && (
                            <span className="team-description">{team.description}</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeTeam(team.id)}
                          className="remove-team-inline-btn"
                          title="Remove team"
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Effort Unit Section */}
              <div className="settings-section">
                <h4>Effort Unit</h4>
                <div className="unit-toggle">
                  <button
                    className={`unit-option ${effortUnit === 'SPRINTS' ? 'active' : ''}`}
                    onClick={() => setEffortUnit('SPRINTS')}
                  >
                    Sprints
                  </button>
                  <button
                    className={`unit-option ${effortUnit === 'DAYS' ? 'active' : ''}`}
                    onClick={() => setEffortUnit('DAYS')}
                  >
                    Days
                  </button>
                </div>
              </div>

              {/* Effort Rating Configuration Section */}
              <div className="settings-section">
                <h4>Auto-Fill Effort Ratings</h4>
                <p className="section-description">
                  Configure how capacity planning totals map to effort ratings in the roadmap planner.
                </p>
                
                {effortRatingConfigs.length === 0 ? (
                  <div>Loading effort rating configurations...</div>
                ) : (
                  effortRatingConfigs.map(config => (
                  <div key={config.unitType} className="rating-config-item">
                    <div className="config-header">
                      <h5>{config.unitType === 'SPRINTS' ? 'Sprints Configuration' : 'Days Configuration'}</h5>
                      <button
                        onClick={() => setEditingRatingConfig(config)}
                        className="edit-config-btn"
                      >
                        <span className="material-icons">edit</span>
                      </button>
                    </div>
                    
                    <div className="rating-ranges">
                      <div className="rating-range">
                        <span className="stars">★</span>
                        <span className="range-text">≤ {config.star1Max} {config.unitType.toLowerCase()}</span>
                      </div>
                      <div className="rating-range">
                        <span className="stars">★★</span>
                        <span className="range-text">{config.star2Min}-{config.star2Max} {config.unitType.toLowerCase()}</span>
                      </div>
                      <div className="rating-range">
                        <span className="stars">★★★</span>
                        <span className="range-text">{config.star3Min}-{config.star3Max} {config.unitType.toLowerCase()}</span>
                      </div>
                      <div className="rating-range">
                        <span className="stars">★★★★</span>
                        <span className="range-text">{config.star4Min}-{config.star4Max} {config.unitType.toLowerCase()}</span>
                      </div>
                      <div className="rating-range">
                        <span className="stars">★★★★★</span>
                        <span className="range-text">≥ {config.star5Min} {config.unitType.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="btn-confirm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Modal */}
      {showTeamModal && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="team-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Team</h3>
              <button 
                onClick={() => setShowTeamModal(false)}
                className="modal-close-btn"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="teamName">Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(prev => ({...prev, name: e.target.value}))}
                  placeholder="Enter team name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="teamDescription">Description (optional)</label>
                <textarea
                  id="teamDescription"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam(prev => ({...prev, description: e.target.value}))}
                  placeholder="Enter team description"
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowTeamModal(false);
                  setNewTeam({ name: '', description: '' });
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await addTeam();
                  setShowTeamModal(false);
                }}
                className="btn-confirm"
                disabled={!newTeam.name.trim()}
              >
                Add Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rating Config Modal */}
      {editingRatingConfig && (
        <div className="modal-overlay" onClick={() => setEditingRatingConfig(null)}>
          <div className="rating-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit {editingRatingConfig.unitType === 'SPRINTS' ? 'Sprints' : 'Days'} Rating Configuration</h3>
              <button 
                onClick={() => setEditingRatingConfig(null)}
                className="modal-close-btn"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="rating-config-form">
                <div className="config-row">
                  <div className="star-label">
                    <span className="stars">★</span>
                    <span>1 Star</span>
                  </div>
                  <div className="range-inputs">
                    <span>≤</span>
                    <input
                      type="number"
                      min="1"
                      value={editingRatingConfig.star1Max}
                      onChange={(e) => setEditingRatingConfig({
                        ...editingRatingConfig,
                        star1Max: parseInt(e.target.value) || 1
                      })}
                      className="config-input"
                    />
                    <span>{editingRatingConfig.unitType.toLowerCase()}</span>
                  </div>
                </div>

                <div className="config-row">
                  <div className="star-label">
                    <span className="stars">★★</span>
                    <span>2 Stars</span>
                  </div>
                  <div className="range-inputs">
                    <input
                      type="number"
                      min="1"
                      value={editingRatingConfig.star2Min}
                      onChange={(e) => setEditingRatingConfig({
                        ...editingRatingConfig,
                        star2Min: parseInt(e.target.value) || 1
                      })}
                      className="config-input"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      min="1"
                      value={editingRatingConfig.star2Max}
                      onChange={(e) => setEditingRatingConfig({
                        ...editingRatingConfig,
                        star2Max: parseInt(e.target.value) || 1
                      })}
                      className="config-input"
                    />
                    <span>{editingRatingConfig.unitType.toLowerCase()}</span>
                  </div>
                </div>

                <div className="config-row">
                  <div className="star-label">
                    <span className="stars">★★★</span>
                    <span>3 Stars</span>
                  </div>
                  <div className="range-inputs">
                    <input
                      type="number"
                      min="1"
                      value={editingRatingConfig.star3Min}
                      onChange={(e) => setEditingRatingConfig({
                        ...editingRatingConfig,
                        star3Min: parseInt(e.target.value) || 1
                      })}
                      className="config-input"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      min="1"
                      value={editingRatingConfig.star3Max}
                      onChange={(e) => setEditingRatingConfig({
                        ...editingRatingConfig,
                        star3Max: parseInt(e.target.value) || 1
                      })}
                      className="config-input"
                    />
                    <span>{editingRatingConfig.unitType.toLowerCase()}</span>
                  </div>
                </div>

                <div className="config-row">
                  <div className="star-label">
                    <span className="stars">★★★★</span>
                    <span>4 Stars</span>
                  </div>
                  <div className="range-inputs">
                    <input
                      type="number"
                      min="1"
                      value={editingRatingConfig.star4Min}
                      onChange={(e) => setEditingRatingConfig({
                        ...editingRatingConfig,
                        star4Min: parseInt(e.target.value) || 1
                      })}
                      className="config-input"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      min="1"
                      value={editingRatingConfig.star4Max}
                      onChange={(e) => setEditingRatingConfig({
                        ...editingRatingConfig,
                        star4Max: parseInt(e.target.value) || 1
                      })}
                      className="config-input"
                    />
                    <span>{editingRatingConfig.unitType.toLowerCase()}</span>
                  </div>
                </div>

                <div className="config-row">
                  <div className="star-label">
                    <span className="stars">★★★★★</span>
                    <span>5 Stars</span>
                  </div>
                  <div className="range-inputs">
                    <span>≥</span>
                    <input
                      type="number"
                      min="1"
                      value={editingRatingConfig.star5Min}
                      onChange={(e) => setEditingRatingConfig({
                        ...editingRatingConfig,
                        star5Min: parseInt(e.target.value) || 1
                      })}
                      className="config-input"
                    />
                    <span>{editingRatingConfig.unitType.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setEditingRatingConfig(null)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={() => updateEffortRatingConfig(editingRatingConfig)}
                className="btn-confirm"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapacityPlanning;