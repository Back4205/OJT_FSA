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

export interface MemberWeeklyActivityResponse {
  day: string;
  assigned: number;
  completed: number;
}

export interface MemberNotificationResponse {
  id: number;
  content: string;
  read: boolean;
  timestamp: string;
  taskId?: number | null;
  taskTitle?: string | null;
  projectName?: string | null;
  priority?: MemberTaskResponse["priority"] | null;
  status?: MemberTaskResponse["status"] | null;
  deadline?: string | null;
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
  weeklyActivity: MemberWeeklyActivityResponse[];
}

export const memberService = {
  getDashboard: async (): Promise<MemberDashboardResponse> => {
    const response = await api.get("/member/dashboard");
    return response.data.data;
  },

  updateTaskStatus: async (taskId: number, status: MemberTaskResponse["status"]): Promise<MemberTaskResponse> => {
    const response = await api.patch(`/member/tasks/${taskId}/status`, { status });
    return response.data.data;
  },

  getNotifications: async (): Promise<MemberNotificationResponse[]> => {
    const response = await api.get("/member/notifications");
    return response.data.data;
  },

  updateNotificationReadState: async (notificationId: number, read: boolean): Promise<MemberNotificationResponse> => {
    const response = await api.patch(`/member/notifications/${notificationId}/read`, null, {
      params: { read }
    });
    return response.data.data;
  },

  markAllNotificationsRead: async (): Promise<MemberNotificationResponse[]> => {
    const response = await api.patch("/member/notifications/read-all");
    return response.data.data;
  }
};
