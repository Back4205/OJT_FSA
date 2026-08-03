import api from "./api";

export interface WorkspaceResponse {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  inviteCode?: string;
}

export interface WorkspaceUpdateRequest {
  name: string;
  description: string;
}

export interface ProjectDetail {
  projectId: number;
  projectName: string;
  roleInProject: "LEADER" | "MEMBER";
}

export interface MembershipResponse {
  id: number;
  userId: number;
  username: string;
  email: string;
  roleName: string;
  active: boolean;
  projects?: ProjectDetail[];
}

export interface MemberAddRequest {
  email: string;
  roleName: "LEADER" | "MEMBER";
}

export interface MemberRoleUpdateRequest {
  roleName: "LEADER" | "MEMBER";
}

export interface ProjectResponse {
  id: number;
  name: string;
  description?: string;
  leaderId: number;
  leaderUsername: string;
  leaderEmail: string;
  workspaceId: number;
  members: Array<{
    id: number;
    username: string;
    email: string;
  }>;
  taskCount: number;
  completedTaskCount: number;
  maxMembers?: number;
  isDeleted?: boolean;
}

export interface ProjectCreateRequest {
  name: string;
  description: string;
  leaderId: number;
  maxMembers: number;
}

export interface ProjectMemberRequest {
  userId: number;
}

export interface DashboardStatsResponse {
  totalProjects: number;
  totalMembers: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  createdTasksWeekly?: number[];
  completedTasksWeekly?: number[];
  totalProjectsGrowth?: number;
  totalMembersGrowth?: number;
  totalTasksGrowth?: number;
  completedTasksGrowth?: number;
  todoTasksGrowth?: number;
  reviewTasksGrowth?: number;
}

export interface UncompletedTaskInfo {
  id: number;
  title: string;
  projectName: string;
  priority: string;
  deadline?: string | null;
}

export interface UserWorkspaceResponse {
  workspaceId: number;
  workspaceName: string;
  roleName: string;
  active: boolean;
  uncompletedTaskCount: number;
  completedTaskCount: number;
  uncompletedTasks: UncompletedTaskInfo[];
}

export const workspaceService = {

  getWorkspaceDetails: async (): Promise<WorkspaceResponse> => {
    const response = await api.get("/workspaces/current");
    return response.data.data;
  },

  updateWorkspaceDetails: async (data: WorkspaceUpdateRequest): Promise<WorkspaceResponse> => {
    const response = await api.put("/workspaces/current", data);
    return response.data.data;
  },

  getMembers: async (isActive?: boolean, roleName?: string): Promise<MembershipResponse[]> => {
    const params: Record<string, any> = {};
    if (isActive !== undefined) params.isActive = isActive;
    if (roleName) params.roleName = roleName;
    const response = await api.get("/workspaces/current/members", { params });
    return response.data.data;
  },

  addMember: async (data: MemberAddRequest): Promise<MembershipResponse> => {
    const response = await api.post("/workspaces/current/members", data);
    return response.data.data;
  },

  updateMemberRole: async (userId: number, data: MemberRoleUpdateRequest): Promise<MembershipResponse> => {
    const response = await api.put(`/workspaces/current/members/${userId}/role`, data);
    return response.data.data;
  },

  deactivateMember: async (userId: number): Promise<void> => {
    await api.delete(`/workspaces/current/members/${userId}`);
  },

  activateMember: async (userId: number): Promise<void> => {
    await api.put(`/workspaces/current/members/${userId}/activate`);
  },

  getProjects: async (): Promise<ProjectResponse[]> => {
    const response = await api.get("/workspaces/current/projects");
    return response.data.data;
  },

  createProject: async (data: ProjectCreateRequest): Promise<ProjectResponse> => {
    const response = await api.post("/workspaces/current/projects", data);
    return response.data.data;
  },

  addProjectMember: async (projectId: number, userId: number): Promise<ProjectResponse> => {
    const response = await api.post(`/workspaces/current/projects/${projectId}/members`, { userId });
    return response.data.data;
  },

  removeProjectMember: async (projectId: number, userId: number): Promise<ProjectResponse> => {
    const response = await api.delete(`/workspaces/current/projects/${projectId}/members/${userId}`);
    return response.data.data;
  },

  updateProjectMemberRole: async (projectId: number, userId: number, roleName: "LEADER" | "MEMBER"): Promise<void> => {
    await api.put(`/workspaces/current/projects/${projectId}/members/${userId}/role`, { roleName });
  },

  completeProject: async (projectId: number): Promise<void> => {
    await api.put(`/workspaces/current/projects/${projectId}/complete`);
  },

  reactivateProject: async (projectId: number): Promise<void> => {
    await api.put(`/workspaces/current/projects/${projectId}/reactivate`);
  },

  getDashboardStats: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get("/workspaces/current/dashboard-stats");
    return response.data.data;
  },

  getActivityLogs: async (): Promise<any[]> => {
    const response = await api.get("/workspaces/current/activity-logs");
    return response.data.data;
  },

  getUserWorkspaces: async (): Promise<UserWorkspaceResponse[]> => {
    const response = await api.get("/auth/workspaces");
    return response.data.data;
  },

  switchWorkspace: async (workspaceId: number): Promise<any> => {
    const response = await api.post(`/auth/switch-workspace?workspaceId=${workspaceId}`);
    return response.data.data;
  },

  createWorkspace: async (name: string, description?: string): Promise<any> => {
    const response = await api.post(`/auth/create-workspace`, null, {
      params: { name, description }
    });
    return response.data.data;
  },

  joinWorkspace: async (inviteCode: string): Promise<any> => {
    const response = await api.post(`/auth/join-workspace`, null, {
      params: { inviteCode }
    });
    return response.data.data;
  }
};
