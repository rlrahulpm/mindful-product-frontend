import api from './api';
import {
  Team,
  TeamMember,
  BacklogEpic,
  UserStory,
  ResourceAssignment,
  TeamRequest,
  TeamMemberRequest,
  ResourceAssignmentRequest,
} from '../types/resourcePlanning.types';

const BASE_PATH = (productId: number) => `/v3/products/${productId}/resource-planning`;

export const resourcePlanningService = {
  // Teams
  createTeam: async (productId: number, teamData: TeamRequest): Promise<Team> => {
    const response = await api.post(`${BASE_PATH(productId)}/teams`, teamData);
    return response.data;
  },

  getTeams: async (productId: number): Promise<Team[]> => {
    const response = await api.get(`${BASE_PATH(productId)}/teams`);
    return response.data;
  },

  deleteTeam: async (productId: number, teamId: number): Promise<void> => {
    await api.delete(`${BASE_PATH(productId)}/teams/${teamId}`);
  },

  // Members
  addMember: async (
    productId: number,
    teamId: number,
    memberData: TeamMemberRequest
  ): Promise<TeamMember> => {
    const response = await api.post(
      `${BASE_PATH(productId)}/teams/${teamId}/members`,
      memberData
    );
    return response.data;
  },

  getTeamMembers: async (productId: number, teamId: number): Promise<TeamMember[]> => {
    const response = await api.get(`${BASE_PATH(productId)}/teams/${teamId}/members`);
    return response.data;
  },

  getAllMembers: async (productId: number): Promise<TeamMember[]> => {
    const response = await api.get(`${BASE_PATH(productId)}/members`);
    return response.data;
  },

  getAvailableMembers: async (
    productId: number,
    startDate: string,
    endDate: string
  ): Promise<TeamMember[]> => {
    const response = await api.get(`${BASE_PATH(productId)}/members/available`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  deleteMember: async (productId: number, memberId: number): Promise<void> => {
    await api.delete(`${BASE_PATH(productId)}/members/${memberId}`);
  },

  // Integration with existing system
  getPublishedEpics: async (productId: number): Promise<BacklogEpic[]> => {
    const response = await api.get(`${BASE_PATH(productId)}/epics`);
    return response.data;
  },

  getUserStoriesByEpic: async (productId: number, epicId: string): Promise<UserStory[]> => {
    const response = await api.get(`${BASE_PATH(productId)}/epics/${epicId}/user-stories`);
    return response.data;
  },

  // Assignments
  createAssignment: async (
    productId: number,
    assignmentData: ResourceAssignmentRequest
  ): Promise<ResourceAssignment> => {
    const response = await api.post(`${BASE_PATH(productId)}/assignments`, assignmentData);
    return response.data;
  },

  getEpicAssignments: async (productId: number, epicId: string): Promise<ResourceAssignment[]> => {
    const response = await api.get(`${BASE_PATH(productId)}/assignments/epic/${epicId}`);
    return response.data;
  },

  getAllAssignments: async (productId: number): Promise<ResourceAssignment[]> => {
    const response = await api.get(`${BASE_PATH(productId)}/assignments`);
    return response.data;
  },

  deleteAssignment: async (productId: number, assignmentId: number): Promise<void> => {
    await api.delete(`${BASE_PATH(productId)}/assignments/${assignmentId}`);
  },
};