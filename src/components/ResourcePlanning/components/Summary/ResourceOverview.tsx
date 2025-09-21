import React, { useState, useEffect } from 'react';
import { ResourcePlanningState, TeamMember, ResourceAssignment } from '../../../../types/resourcePlanning.types';
import { resourcePlanningService } from '../../../../services/resourcePlanningService';

interface ResourceOverviewProps {
  productId: number;
  state: ResourcePlanningState;
  updateState: (updates: Partial<ResourcePlanningState>) => void;
}

const ResourceOverview: React.FC<ResourceOverviewProps> = ({
  productId,
  state,
  updateState,
}) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAllAssignments();
  }, [productId]);

  const loadAllAssignments = async () => {
    try {
      const assignments = await resourcePlanningService.getAllAssignments(productId);
      updateState({ assignments });
    } catch (error) {
      console.error('Failed to load assignments:', error);
    }
  };

  const getTeamUtilization = () => {
    return state.teams.map(team => {
      const teamMembers = state.allMembers.filter(member => member.teamId === team.id);
      const teamAssignments = state.assignments.filter(assignment =>
        teamMembers.some(member => member.id === assignment.memberId)
      );

      return {
        team,
        memberCount: teamMembers.length,
        activeAssignments: teamAssignments.length,
        utilization: teamMembers.length > 0 ? (teamAssignments.length / teamMembers.length) * 100 : 0
      };
    });
  };

  const getMemberWorkload = () => {
    return state.allMembers.map(member => {
      const memberAssignments = state.assignments.filter(assignment => assignment.memberId === member.id);
      const currentAssignments = memberAssignments.filter(assignment => {
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        const now = new Date();
        return assignmentStart <= now && assignmentEnd >= now;
      });

      return {
        member,
        totalAssignments: memberAssignments.length,
        currentAssignments: currentAssignments.length,
        upcomingAssignments: memberAssignments.filter(assignment =>
          new Date(assignment.startDate) > new Date()
        ).length
      };
    });
  };

  const getUpcomingDeadlines = () => {
    const upcoming = state.assignments
      .filter(assignment => {
        const endDate = new Date(assignment.endDate);
        const now = new Date();
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return endDate >= now && endDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(0, 10);

    return upcoming;
  };

  const teamUtilization = getTeamUtilization();
  const memberWorkload = getMemberWorkload();
  const upcomingDeadlines = getUpcomingDeadlines();

  return (
    <div className="resource-overview">
      <div className="overview-header">
        <h2>Resource Overview</h2>
        <div className="date-filter">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="overview-grid">
        {/* Summary Cards */}
        <div className="summary-section">
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <span className="material-icons">groups</span>
              </div>
              <div className="card-content">
                <h3>{state.teams.length}</h3>
                <p>Active Teams</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <span className="material-icons">person</span>
              </div>
              <div className="card-content">
                <h3>{state.allMembers.length}</h3>
                <p>Team Members</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <span className="material-icons">assignment</span>
              </div>
              <div className="card-content">
                <h3>{state.assignments.length}</h3>
                <p>Active Assignments</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <span className="material-icons">schedule</span>
              </div>
              <div className="card-content">
                <h3>{upcomingDeadlines.length}</h3>
                <p>Upcoming Deadlines</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Utilization */}
        <div className="team-utilization-section">
          <h3>Team Utilization</h3>
          <div className="utilization-list">
            {teamUtilization.map(({ team, memberCount, activeAssignments, utilization }) => (
              <div key={team.id} className="utilization-item">
                <div className="team-info">
                  <h4>{team.name}</h4>
                  <p>{memberCount} members • {activeAssignments} active assignments</p>
                </div>
                <div className="utilization-bar">
                  <div
                    className={`utilization-fill ${utilization > 80 ? 'high' : utilization > 50 ? 'medium' : 'low'}`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  ></div>
                  <span className="utilization-text">{utilization.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Member Workload */}
        <div className="member-workload-section">
          <h3>Member Workload</h3>
          <div className="workload-table">
            <div className="table-header">
              <div>Member</div>
              <div>Team</div>
              <div>Current</div>
              <div>Upcoming</div>
              <div>Total</div>
            </div>
            {memberWorkload.map(({ member, totalAssignments, currentAssignments, upcomingAssignments }) => (
              <div key={member.id} className="table-row">
                <div className="member-cell">
                  <strong>{member.memberName}</strong>
                  {member.role && <span className="member-role">{member.role}</span>}
                </div>
                <div>{member.team?.name}</div>
                <div>
                  <span className={`assignment-count ${currentAssignments > 2 ? 'high' : currentAssignments > 0 ? 'medium' : 'low'}`}>
                    {currentAssignments}
                  </span>
                </div>
                <div>{upcomingAssignments}</div>
                <div>{totalAssignments}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="deadlines-section">
          <h3>Upcoming Deadlines</h3>
          <div className="deadlines-list">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((assignment) => (
                <div key={assignment.id} className="deadline-item">
                  <div className="deadline-info">
                    <h4>{assignment.userStory?.storyTitle}</h4>
                    <p>Assigned to {assignment.member?.memberName}</p>
                  </div>
                  <div className="deadline-date">
                    <span className="material-icons">schedule</span>
                    {new Date(assignment.endDate).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <span className="material-icons">schedule</span>
                <p>No upcoming deadlines in the next 30 days</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceOverview;