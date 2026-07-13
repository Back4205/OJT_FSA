export interface User {
  name: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ otpRequired: boolean; email?: string }>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
