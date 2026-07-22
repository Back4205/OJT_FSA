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
}

export interface CompletedTaskInfo {
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
  uncompletedTaskCount: number;
  completedTaskCount: number;
  completedTasks: CompletedTaskInfo[];
}

export const workspaceService = {
  // Lấy chi tiết Workspace hiện tại
  getWorkspaceDetails: async (): Promise<WorkspaceResponse> => {
    const response = await api.get("/workspaces/current");
    return response.data.data;
  },

  // Cập nhật thông tin Workspace hiện tại
  updateWorkspaceDetails: async (data: WorkspaceUpdateRequest): Promise<WorkspaceResponse> => {
    const response = await api.put("/workspaces/current", data);
    return response.data.data;
  },

  // Lấy danh sách thành viên Workspace
  getMembers: async (isActive?: boolean, roleName?: string): Promise<MembershipResponse[]> => {
    const params: Record<string, any> = {};
    if (isActive !== undefined) params.isActive = isActive;
    if (roleName) params.roleName = roleName;
    const response = await api.get("/workspaces/current/members", { params });
    return response.data.data;
  },

  // Thêm thành viên vào Workspace
  addMember: async (data: MemberAddRequest): Promise<MembershipResponse> => {
    const response = await api.post("/workspaces/current/members", data);
    return response.data.data;
  },

  // Cập nhật vai trò thành viên
  updateMemberRole: async (userId: number, data: MemberRoleUpdateRequest): Promise<MembershipResponse> => {
    const response = await api.put(`/workspaces/current/members/${userId}/role`, data);
    return response.data.data;
  },

  // Vô hiệu hóa thành viên
  deactivateMember: async (userId: number): Promise<void> => {
    await api.delete(`/workspaces/current/members/${userId}`);
  },

  // Kích hoạt lại thành viên
  activateMember: async (userId: number): Promise<void> => {
    await api.put(`/workspaces/current/members/${userId}/activate`);
  },

  // Lấy danh sách dự án trong Workspace
  getProjects: async (): Promise<ProjectResponse[]> => {
    const response = await api.get("/workspaces/current/projects");
    return response.data.data;
  },

  // Tạo dự án mới
  createProject: async (data: ProjectCreateRequest): Promise<ProjectResponse> => {
    const response = await api.post("/workspaces/current/projects", data);
    return response.data.data;
  },

  // Thêm thành viên vào dự án
  addProjectMember: async (projectId: number, userId: number): Promise<ProjectResponse> => {
    const response = await api.post(`/workspaces/current/projects/${projectId}/members`, { userId });
    return response.data.data;
  },

  // Xóa thành viên khỏi dự án
  removeProjectMember: async (projectId: number, userId: number): Promise<ProjectResponse> => {
    const response = await api.delete(`/workspaces/current/projects/${projectId}/members/${userId}`);
    return response.data.data;
  },

  // Cập nhật vai trò của thành viên trong dự án
  updateProjectMemberRole: async (projectId: number, userId: number, roleName: "LEADER" | "MEMBER"): Promise<void> => {
    await api.put(`/workspaces/current/projects/${projectId}/members/${userId}/role`, { roleName });
  },

  // Kết thúc dự án (Xóa mềm)
  completeProject: async (projectId: number): Promise<void> => {
    await api.put(`/workspaces/current/projects/${projectId}/complete`);
  },

  // Kích hoạt lại dự án đã kết thúc
  reactivateProject: async (projectId: number): Promise<void> => {
    await api.put(`/workspaces/current/projects/${projectId}/reactivate`);
  },

  // Lấy thống kê của Dashboard
  getDashboardStats: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get("/workspaces/current/dashboard-stats");
    return response.data.data;
  },

  // Lấy danh sách tất cả các Workspace của User hiện tại để chuyển đổi
  getUserWorkspaces: async (): Promise<UserWorkspaceResponse[]> => {
    const response = await api.get("/auth/workspaces");
    return response.data.data;
  },

  // Chuyển đổi Workspace hiện tại
  switchWorkspace: async (workspaceId: number): Promise<any> => {
    const response = await api.post(`/auth/switch-workspace?workspaceId=${workspaceId}`);
    return response.data.data;
  },

  // Tạo Workspace mới
  createWorkspace: async (name: string, description?: string): Promise<any> => {
    const response = await api.post(`/auth/create-workspace`, null, {
      params: { name, description }
    });
    return response.data.data;
  },

  // Gia nhập Workspace thông qua mã mời
  joinWorkspace: async (inviteCode: string): Promise<any> => {
    const response = await api.post(`/auth/join-workspace`, null, {
      params: { inviteCode }
    });
    return response.data.data;
  }
};
