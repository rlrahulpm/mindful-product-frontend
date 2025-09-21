export interface Team {
  id: number;
  name: string;
  description?: string;
  productId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  memberName: string;
  role?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  team?: Team;
}

export interface UserStory {
  id: number;
  title: string;
  description?: string;
  storyTitle?: string; // Keep for backward compatibility
  storyDescription?: string; // Keep for backward compatibility
  acceptanceCriteria?: string;
  storyPoints?: number;
  priority?: string;
  status?: string;
  epic?: BacklogEpic;
}

export interface BacklogEpic {
  id: number;
  epicId: string;
  epicName: string;
  epicDescription?: string;
  priority?: string;
  status?: string;
  published: boolean;
}

export interface ResourceAssignment {
  id: number;
  userStoryId: number;
  memberId: number;
  startDate: string;
  endDate: string;
  productId: number;
  createdAt: string;
  updatedAt: string;
  userStory?: UserStory;
  member?: TeamMember;
}

export interface TeamRequest {
  name: string;
  description?: string;
}

export interface TeamMemberRequest {
  memberName: string;
  role?: string;
  email?: string;
}

export interface ResourceAssignmentRequest {
  userStoryId: number;
  memberId: number;
  startDate: string;
  endDate: string;
}

export interface ResourcePlanningState {
  teams: Team[];
  selectedTeam: Team | null;
  publishedEpics: BacklogEpic[];
  selectedEpic: BacklogEpic | null;
  userStories: UserStory[];
  selectedUserStory: UserStory | null;
  assignments: ResourceAssignment[];
  availableMembers: TeamMember[];
  allMembers: TeamMember[];
  loading: boolean;
  error: string | null;
}