import React, { useState, useEffect } from 'react';
import { ResourcePlanningState, BacklogEpic, UserStory, TeamMember, ResourceAssignmentRequest } from '../../../../types/resourcePlanning.types';
import { resourcePlanningService } from '../../../../services/resourcePlanningService';
import Notification from '../Notification/Notification';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';

interface PlanningCanvasProps {
  productId: number;
  state: ResourcePlanningState;
  updateState: (updates: Partial<ResourcePlanningState>) => void;
}

const PlanningCanvas: React.FC<PlanningCanvasProps> = ({
  productId,
  state,
  updateState,
}) => {
  const [showAssignmentForm, setShowAssignmentForm] = useState<number | null>(null);
  const [assignmentFormData, setAssignmentFormData] = useState<ResourceAssignmentRequest>({
    userStoryId: 0,
    memberId: 0,
    startDate: '',
    endDate: ''
  });

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    assignmentId: number | null;
  }>({ isOpen: false, assignmentId: null });

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, type, isVisible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const handleSelectEpic = async (epic: BacklogEpic) => {
    updateState({ selectedEpic: epic, loading: true });

    try {
      console.log('Fetching user stories for epic:', epic.epicId);
      const [userStories, assignments] = await Promise.all([
        resourcePlanningService.getUserStoriesByEpic(productId, epic.epicId),
        resourcePlanningService.getEpicAssignments(productId, epic.epicId)
      ]);

      console.log('User stories fetched:', userStories);
      console.log('Assignments fetched:', assignments);

      updateState({
        selectedEpic: epic,
        userStories,
        assignments,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load epic details:', error);
      updateState({ loading: false, userStories: [], assignments: [] });
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend validation
    if (assignmentFormData.startDate > assignmentFormData.endDate) {
      showNotification('Start date must be before or equal to end date', 'warning');
      return;
    }

    try {
      await resourcePlanningService.createAssignment(productId, assignmentFormData);
      setAssignmentFormData({ userStoryId: 0, memberId: 0, startDate: '', endDate: '' });
      setShowAssignmentForm(null);

      if (state.selectedEpic) {
        const assignments = await resourcePlanningService.getEpicAssignments(productId, state.selectedEpic.epicId);
        updateState({ assignments });
      }
      showNotification('Assignment created successfully', 'success');
    } catch (error: any) {
      console.error('Failed to create assignment:', error);

      // Show user-friendly error message
      if (error.response?.data?.error) {
        showNotification(error.response.data.error, 'error');
      } else if (error.message) {
        showNotification(`Failed to create assignment: ${error.message}`, 'error');
      } else {
        showNotification('Failed to create assignment. Please try again.', 'error');
      }
    }
  };

  const handleDeleteAssignment = (assignmentId: number) => {
    setConfirmDialog({ isOpen: true, assignmentId });
  };

  const confirmDeleteAssignment = async () => {
    if (!confirmDialog.assignmentId) return;

    try {
      await resourcePlanningService.deleteAssignment(productId, confirmDialog.assignmentId);

      if (state.selectedEpic) {
        const assignments = await resourcePlanningService.getEpicAssignments(productId, state.selectedEpic.epicId);
        updateState({ assignments });
      }
      showNotification('Assignment removed successfully', 'success');
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      showNotification('Failed to remove assignment. Please try again.', 'error');
    } finally {
      setConfirmDialog({ isOpen: false, assignmentId: null });
    }
  };

  const cancelDeleteAssignment = () => {
    setConfirmDialog({ isOpen: false, assignmentId: null });
  };

  const getAssignedMembers = (userStoryId: number) => {
    return state.assignments
      .filter(assignment => assignment.userStoryId === userStoryId)
      .map(assignment => assignment.member)
      .filter(Boolean);
  };

  const startAssignment = (userStoryId: number) => {
    setAssignmentFormData({ ...assignmentFormData, userStoryId });
    setShowAssignmentForm(userStoryId);
  };

  const getAvailableMembers = () => {
    if (!assignmentFormData.startDate || !assignmentFormData.endDate) {
      return state.allMembers;
    }

    const selectedStart = new Date(assignmentFormData.startDate);
    const selectedEnd = new Date(assignmentFormData.endDate);

    return state.allMembers.filter(member => {
      // Check if member has any conflicting assignments
      const hasConflict = state.assignments.some(assignment => {
        if (assignment.memberId !== member.id) return false;

        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);

        // Check for date overlap
        return (selectedStart <= assignmentEnd && selectedEnd >= assignmentStart);
      });

      return !hasConflict;
    });
  };

  return (
    <div className="planning-canvas">
      {!state.selectedEpic ? (
        <div className="epic-selection">
          <h2>Select an Epic to Start Planning</h2>
          <div className="epics-grid">
            {state.publishedEpics.map((epic) => (
              <div
                key={epic.id}
                className="epic-card"
                onClick={() => handleSelectEpic(epic)}
              >
                <div className="epic-header">
                  <h3>{epic.epicName}</h3>
                  <span className="epic-id">#{epic.epicId}</span>
                </div>
                {epic.epicDescription && (
                  <p className="epic-description">{epic.epicDescription}</p>
                )}
                <div className="epic-meta">
                  <span className={`priority ${epic.priority?.toLowerCase()}`}>
                    {epic.priority}
                  </span>
                  <span className={`status ${epic.status?.toLowerCase()}`}>
                    {epic.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="epic-planning">
          <div className="planning-header">
            <button
              className="back-button"
              onClick={() => updateState({ selectedEpic: null, userStories: [], assignments: [] })}
              title="Back to Epics"
            >
              <span className="back-arrow">←</span>
            </button>
            <div className="epic-info">
              <h2>{state.selectedEpic.epicName}</h2>
              <span className="epic-id">#{state.selectedEpic.epicId}</span>
            </div>
          </div>

          <div className="user-stories-section">
            <h3>User Stories</h3>
            {state.loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading user stories...</p>
              </div>
            ) : state.userStories.length === 0 ? (
              <div className="empty-state">
                <span className="material-icons">assignment</span>
                <p>No user stories found for this epic</p>
              </div>
            ) : (
            <div className="user-stories-list">
              {state.userStories.map((story) => {
                const assignedMembers = getAssignedMembers(story.id);
                return (
                  <div key={story.id} className="user-story-card">
                    <div className="story-header">
                      <h4>{story.title || story.storyTitle}</h4>
                      <div className="story-meta">
                        {story.storyPoints && (
                          <span className="story-points">{story.storyPoints} pts</span>
                        )}
                        {story.priority && (
                          <span className={`priority ${story.priority.toLowerCase()}`}>
                            {story.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    {(story.description || story.storyDescription) && (
                      <p className="story-description">{story.description || story.storyDescription}</p>
                    )}

                    <div className="story-assignments">
                      <div className="assignments-header">
                        <h5>Assigned Members ({assignedMembers.length})</h5>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => startAssignment(story.id)}
                        >
                          <span className="material-icons">person_add</span>
                          Assign
                        </button>
                      </div>

                      {assignedMembers.length > 0 ? (
                        <div className="assigned-members">
                          {state.assignments
                            .filter(assignment => assignment.userStoryId === story.id)
                            .map((assignment) => (
                              <div key={assignment.id} className="assignment-card">
                                <div className="member-info">
                                  <strong>{assignment.member?.memberName}</strong>
                                  {assignment.member?.role && (
                                    <span className="member-role">{assignment.member.role}</span>
                                  )}
                                </div>
                                <div className="assignment-dates">
                                  {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}
                                </div>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                >
                                  <span className="material-icons">close</span>
                                </button>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="no-assignments">No members assigned yet</p>
                      )}

                      {showAssignmentForm === story.id && (
                        <div className="assignment-form">
                          <h5>Assign Member to Story</h5>
                          <form onSubmit={handleCreateAssignment}>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Start Date *</label>
                                <input
                                  type="date"
                                  value={assignmentFormData.startDate}
                                  onChange={(e) => setAssignmentFormData({
                                    ...assignmentFormData,
                                    startDate: e.target.value,
                                    memberId: 0 // Reset member selection when dates change
                                  })}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>End Date *</label>
                                <input
                                  type="date"
                                  value={assignmentFormData.endDate}
                                  onChange={(e) => setAssignmentFormData({
                                    ...assignmentFormData,
                                    endDate: e.target.value,
                                    memberId: 0 // Reset member selection when dates change
                                  })}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>Team Member *</label>
                                {(() => {
                                  const availableMembers = getAvailableMembers();
                                  const unavailableCount = state.allMembers.length - availableMembers.length;

                                  return (
                                    <>
                                      <select
                                        value={assignmentFormData.memberId}
                                        onChange={(e) => setAssignmentFormData({
                                          ...assignmentFormData,
                                          memberId: parseInt(e.target.value)
                                        })}
                                        required
                                      >
                                        <option value="">
                                          {assignmentFormData.startDate && assignmentFormData.endDate
                                            ? `Select from ${availableMembers.length} available member${availableMembers.length !== 1 ? 's' : ''}`
                                            : 'Select dates first to see available members'
                                          }
                                        </option>
                                        {availableMembers.map((member) => (
                                          <option key={member.id} value={member.id}>
                                            {member.memberName}{member.team?.name ? ` (${member.team.name})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                      {assignmentFormData.startDate && assignmentFormData.endDate && unavailableCount > 0 && (
                                        <small className="availability-note">
                                          {unavailableCount} member{unavailableCount !== 1 ? 's' : ''} unavailable due to conflicting assignments
                                        </small>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="form-actions">
                              <button type="button" onClick={() => setShowAssignmentForm(null)}>
                                Cancel
                              </button>
                              <button type="submit" className="btn btn-primary">
                                Assign Member
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      )}

      {state.publishedEpics.length === 0 && (
        <div className="empty-state">
          <span className="material-icons">assignment</span>
          <h3>No published epics available</h3>
          <p>Publish some epics from the backlog to start resource planning</p>
        </div>
      )}

      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Remove Assignment"
        message="Are you sure you want to remove this assignment? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDeleteAssignment}
        onCancel={cancelDeleteAssignment}
      />
    </div>
  );
};

export default PlanningCanvas;