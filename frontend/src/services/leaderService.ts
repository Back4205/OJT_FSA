import api from "./api";
import { type UserWorkspaceResponse } from "./workspaceService";

// ── Types ──────────────────────────────────────────────────────────────────

export type TaskStatus   = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ProjectMember {
  id: number;
  username: string;
  email: string;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description?: string;
  leaderId: number;
  leaderUsername: string;
  leaderEmail: string;
  workspaceId: number;
  members: ProjectMember[];
  taskCount: number;
  completedTaskCount: number;
  maxMembers?: number;
}

export interface TaskResponse {
  id: number;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline?: string;        // ISO date string "2026-08-01"
  projectId: number;
  projectName: string;
  assigneeId?: number;
  assigneeUsername?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  maxMembers?: number;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority: TaskPriority;
  deadline?: string;
  projectId: number;
  assigneeId?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
  assigneeId?: number; // -1 = unassign
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // current page (0-based)
  size: number;
}

export interface WorkspaceMemberShort {
  id: number;       // membership id
  userId: number;   // user id (dùng để gán assignee)
  username: string;
  email: string;
  roleName: string;
  active: boolean;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const leaderService = {

  // Projects ----------------------------------------------------------------
  getProjects: async (): Promise<ProjectResponse[]> => {
    const res = await api.get("/projects");
    return res.data.data;
  },

  getProjectById: async (id: number): Promise<ProjectResponse> => {
    const res = await api.get(`/projects/${id}`);
    return res.data.data;
  },

  createProject: async (data: CreateProjectRequest): Promise<ProjectResponse> => {
    const res = await api.post("/projects", data);
    return res.data.data;
  },

  updateProject: async (id: number, data: UpdateProjectRequest): Promise<ProjectResponse> => {
    const res = await api.put(`/projects/${id}`, data);
    return res.data.data;
  },

  deleteProject: async (id: number): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  addProjectMember: async (projectId: number, memberId: number): Promise<void> => {
    await api.post(`/projects/${projectId}/members`, { memberId });
  },

  removeProjectMember: async (projectId: number, memberId: number): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
  },

  // Tasks -------------------------------------------------------------------
  getTasksByProject: async (
    projectId: number,
    page = 0,
    size = 10,
    status?: TaskStatus,
    priority?: TaskPriority,
    sortBy = "id",
    sortDir = "asc"
  ): Promise<PageResponse<TaskResponse>> => {
    const params: Record<string, any> = { page, size, sortBy, sortDir };
    if (status)   params.status   = status;
    if (priority) params.priority = priority;
    const res = await api.get(`/tasks/project/${projectId}`, { params });
    return res.data.data;
  },

  getTaskById: async (id: number): Promise<TaskResponse> => {
    const res = await api.get(`/tasks/${id}`);
    return res.data.data;
  },

  createTask: async (data: CreateTaskRequest): Promise<TaskResponse> => {
    const res = await api.post("/tasks", data);
    return res.data.data;
  },

  updateTask: async (id: number, data: UpdateTaskRequest): Promise<TaskResponse> => {
    const res = await api.put(`/tasks/${id}`, data);
    return res.data.data;
  },

  updateTaskStatus: async (id: number, status: TaskStatus): Promise<TaskResponse> => {
    const res = await api.patch(`/tasks/${id}/status`, { status });
    return res.data.data;
  },

  deleteTask: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  // Workspace members (read + invite MEMBER only) ---------------------------
  getWorkspaceMembers: async (): Promise<WorkspaceMemberShort[]> => {
    // Gọi /api/leader/members — endpoint riêng cho LEADER, không phải /workspaces/current/members
    const res = await api.get("/leader/members");
    return res.data.data;
  },

  inviteMember: async (email: string): Promise<void> => {
    // Backend tự ép roleName = "MEMBER", LEADER không được invite LEADER khác
    await api.post("/leader/members/invite", { email, roleName: "MEMBER" });
  },

  getDashboardStats: async (): Promise<any> => {
    const res = await api.get("/leader/dashboard-stats");
    return res.data.data;
  },

  // User workspaces (switch) ------------------------------------------------
  getUserWorkspaces: async (): Promise<UserWorkspaceResponse[]> => {
    const res = await api.get("/auth/workspaces");
    return res.data.data as UserWorkspaceResponse[];
  },

  switchWorkspace: async (workspaceId: number) => {
    const res = await api.post(`/auth/switch-workspace?workspaceId=${workspaceId}`);
    return res.data.data;
  },
};
