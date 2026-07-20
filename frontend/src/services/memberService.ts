import api from "./api";

export interface MemberTaskResponse {
  id: number;
  title: string;
  description?: string;
  projectName?: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  deadline?: string | null;
}

export interface MemberActivityResponse {
  title: string;
  detail: string;
  timeLabel: string;
  tone: "neutral" | "info" | "success" | "warning";
}

export interface MemberDashboardResponse {
  userId: number;
  username: string;
  email: string;
  workspaceId: number | null;
  workspaceName: string | null;
  role: string;
  totalAssignedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  dueSoonTasks: number;
  overdueTasks: number;
  tasks: MemberTaskResponse[];
  activities: MemberActivityResponse[];
}

export const memberService = {
  getDashboard: async (): Promise<MemberDashboardResponse> => {
    const response = await api.get("/member/dashboard");
    return response.data.data;
  },

  updateTaskStatus: async (taskId: number, status: MemberTaskResponse["status"]): Promise<MemberTaskResponse> => {
    const response = await api.patch(`/member/tasks/${taskId}/status`, { status });
    return response.data.data;
  }
};
