import api from "./api";

export interface TaskComment {
  id: number;
  content: string;
  timestamp: string; // ISO string
  taskId: number;
  userId: number;
  username: string;
}

export const commentService = {
  getCommentsByTask: async (taskId: number): Promise<TaskComment[]> => {
    const res = await api.get(`/comments/task/${taskId}`);
    return res.data.data;
  },

  addCommentToTask: async (taskId: number, content: string): Promise<TaskComment> => {
    const res = await api.post(`/comments`, { taskId, content });
    return res.data.data;
  }
};
