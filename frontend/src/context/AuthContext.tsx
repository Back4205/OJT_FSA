import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import type { User, AuthContextType } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const WORKSPACE_ENTRY_MODE_KEY = "taskmanager.workspace.entry-mode";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    localStorage.removeItem(WORKSPACE_ENTRY_MODE_KEY);
    const response = await api.post("/auth/login", { email, password });
    if (response.data.message === "OTP_REQUIRED") {
      return { otpRequired: true, email: response.data.data };
    }
    await checkAuth();
    return { otpRequired: false };
  };

  const verifyOtp = async (email: string, otpCode: string) => {
    await api.post("/auth/verify-otp", { email, otpCode });
    await checkAuth();
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      localStorage.removeItem(WORKSPACE_ENTRY_MODE_KEY);
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, verifyOtp, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
