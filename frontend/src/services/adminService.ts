import api from "./api";

export interface AdminDashboardResponse {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  superAdmins: number;
  totalWorkspaces: number;
  activeWorkspaces: number;
  lockedWorkspaces: number;
  totalMemberships: number;
  activeMemberships: number;
  weeklyActivity: AdminWeeklyActivityResponse[];
}

export interface AdminWeeklyActivityResponse {
  day: string;
  users: number;
  workspaces: number;
}

export interface AdminUserSummaryResponse {
  id: number;
  username: string;
  email: string;
  provider: string;
  active: boolean;
  superAdmin: boolean;
  emailVerified: boolean;
  membershipCount: number;
  createdAt?: string;
}

export interface AdminWorkspaceSummaryResponse {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  memberCount: number;
  workspaceAdminCount: number;
  leaderCount: number;
  regularMemberCount: number;
  totalTaskCount: number;
  completedTaskCount: number;
  progressPercent: number;
  participantInitials: string[];
  createdAt?: string;
}

export interface AdminMembershipResponse {
  membershipId: number;
  userId: number;
  username: string;
  email: string;
  workspaceId: number;
  workspaceName: string;
  role: string;
  active: boolean;
}

export interface AdminUserDetailResponse {
  id: number;
  username: string;
  email: string;
  provider: string;
  active: boolean;
  superAdmin: boolean;
  emailVerified: boolean;
  membershipCount: number;
  activeMembershipCount: number;
  memberships: AdminMembershipResponse[];
}

export interface AdminWorkspaceDetailResponse {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  memberCount: number;
  activeMemberCount: number;
  workspaceAdminCount: number;
  leaderCount: number;
  regularMemberCount: number;
  memberships: AdminMembershipResponse[];
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export const adminService = {
  getDashboard: async (): Promise<AdminDashboardResponse> => {
    const response = await api.get("/admin/dashboard");
    return response.data.data;
  },

  getUsers: async (params?: { search?: string; active?: boolean; superAdmin?: boolean; page?: number; size?: number }): Promise<PageResponse<AdminUserSummaryResponse>> => {
    const response = await api.get("/admin/users", { params });
    return response.data.data;
  },

  getUser: async (userId: number): Promise<AdminUserDetailResponse> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data.data;
  },

  getUserMemberships: async (userId: number, params?: { page?: number; size?: number }): Promise<PageResponse<AdminMembershipResponse>> => {
    const response = await api.get(`/admin/users/${userId}/memberships`, { params });
    return response.data.data;
  },

  getWorkspaces: async (params?: { search?: string; active?: boolean; page?: number; size?: number }): Promise<PageResponse<AdminWorkspaceSummaryResponse>> => {
    const response = await api.get("/admin/workspaces", { params });
    return response.data.data;
  },

  getWorkspace: async (workspaceId: number): Promise<AdminWorkspaceDetailResponse> => {
    const response = await api.get(`/admin/workspaces/${workspaceId}`);
    return response.data.data;
  },

  getWorkspaceMembers: async (workspaceId: number, params?: { page?: number; size?: number }): Promise<PageResponse<AdminMembershipResponse>> => {
    const response = await api.get(`/admin/workspaces/${workspaceId}/members`, { params });
    return response.data.data;
  },

  lockUser: async (userId: number): Promise<AdminUserSummaryResponse> => {
    const response = await api.patch(`/admin/users/${userId}/lock`);
    return response.data.data;
  },

  unlockUser: async (userId: number): Promise<AdminUserSummaryResponse> => {
    const response = await api.patch(`/admin/users/${userId}/unlock`);
    return response.data.data;
  },

  setSuperAdmin: async (userId: number, enabled: boolean): Promise<AdminUserSummaryResponse> => {
    const response = await api.patch(`/admin/users/${userId}/super-admin`, null, {
      params: { enabled }
    });
    return response.data.data;
  },

  setUserEmailVerified: async (userId: number, enabled: boolean): Promise<AdminUserSummaryResponse> => {
    const response = await api.patch(`/admin/users/${userId}/email-verified`, null, {
      params: { enabled }
    });
    return response.data.data;
  },

  resetUserPassword: async (userId: number, password: string): Promise<AdminUserSummaryResponse> => {
    const response = await api.patch(`/admin/users/${userId}/password`, { password });
    return response.data.data;
  },

  lockWorkspace: async (workspaceId: number): Promise<AdminWorkspaceSummaryResponse> => {
    const response = await api.patch(`/admin/workspaces/${workspaceId}/lock`);
    return response.data.data;
  },

  unlockWorkspace: async (workspaceId: number): Promise<AdminWorkspaceSummaryResponse> => {
    const response = await api.patch(`/admin/workspaces/${workspaceId}/unlock`);
    return response.data.data;
  }
};
