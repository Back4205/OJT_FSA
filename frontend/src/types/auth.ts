export interface User {
  id: number;
  username: string;
  email: string;
  role: "MEMBER" | "LEADER" | "WORKSPACE_ADMIN" | "SUPER_ADMIN";
  active: boolean;
  workspaceId: number | null;
  workspaceName: string | null;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ otpRequired: boolean; email?: string }>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
