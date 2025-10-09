import React, { useState, useEffect } from 'react';
import { ResourcePlanningState, Team, TeamMember, TeamRequest, TeamMemberRequest } from '../../../../types/resourcePlanning.types';
import { resourcePlanningService } from '../../../../services/resourcePlanningService';
import { getCurrentQuarter } from '../../../../utils/quarterUtils';

interface TeamManagementProps {
  productId: number;
  state: ResourcePlanningState;
  updateState: (updates: Partial<ResourcePlanningState>) => void;
  onRefresh: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({
  productId,
  state,
  updateState,
  onRefresh,
}) => {
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState<number | null>(null);
  const [teamFormData, setTeamFormData] = useState<TeamRequest>({ name: '', description: '' });
  const [memberFormData, setMemberFormData] = useState<TeamMemberRequest>({
    memberName: ''
  });

  // Lock/unlock body scroll when modals are open
  useEffect(() => {
    const isAnyModalOpen = showCreateTeam || showAddMember !== null;

    if (isAnyModalOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px';
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
  }, [showCreateTeam, showAddMember]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { year, quarter } = getCurrentQuarter();
      await resourcePlanningService.createTeam(productId, year, quarter, teamFormData);
      setTeamFormData({ name: '', description: '' });
      setShowCreateTeam(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  };

  const handleAddMember = async (e: React.FormEvent, teamId: number) => {
    e.preventDefault();
    try {
      await resourcePlanningService.addMember(productId, teamId, memberFormData);
      setMemberFormData({ memberName: '' });
      setShowAddMember(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      try {
        const { year, quarter } = getCurrentQuarter();
        await resourcePlanningService.deleteTeam(productId, year, quarter, teamId);
        onRefresh();
      } catch (error) {
        console.error('Failed to delete team:', error);
      }
    }
  };

  return (
    <div className="team-management">
      <div className="section-header">
        <h2>Team Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateTeam(true)}
        >
          <span className="material-icons">add</span>
          Create Team
        </button>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="resource-planning-modal-overlay">
          <div className="resource-planning-modal">
            <h3>Create New Team</h3>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label>Team Name *</label>
                <input
                  type="text"
                  value={teamFormData.name}
                  onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={teamFormData.description}
                  onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateTeam(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teams List */}
      <div className="teams-list">
        {state.teams.map((team) => (
          <div key={team.id} className="team-card">
            <div className="team-header">
              <div>
                <h3>{team.name}</h3>
                {team.description && <p>{team.description}</p>}
              </div>
              <div className="team-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddMember(team.id)}
                >
                  <span className="material-icons">person_add</span>
                  Add Member
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteTeam(team.id)}
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            </div>

            {/* Add Member Form */}
            {showAddMember === team.id && (
              <div className="add-member-form">
                <h4>Add Team Member</h4>
                <form onSubmit={(e) => handleAddMember(e, team.id)}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        value={memberFormData.memberName}
                        onChange={(e) => setMemberFormData({ ...memberFormData, memberName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddMember(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Add Member</button>
                  </div>
                </form>
              </div>
            )}

            {/* Team Members */}
            <div className="team-members">
              <h4>Team Members ({state.allMembers.filter(m => m.teamId === team.id).length})</h4>
              <div className="members-grid">
                {state.allMembers
                  .filter(member => member.teamId === team.id)
                  .map((member) => (
                    <div key={member.id} className="member-card">
                      <div className="member-info">
                        <strong>{member.memberName}</strong>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {state.teams.length === 0 && (
        <div className="empty-state">
          <span className="material-icons">groups</span>
          <h3>No teams created yet</h3>
          <p>Create your first team to start managing resources</p>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;