import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import axios from "axios";
import type  { User, AuthContextType } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      console.log("Đang kiểm tra đăng nhập...");
      const response = await api.get("/auth/me");
      setUser(response.data.data);
    } catch (error) {
      console.log("Người dùng chưa đăng nhập hoặc phiên đã hết hạn.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    await api.post("/auth/login", { email, password });
    await checkAuth();
  };

  const logout = async () => {
    try {
      await axios.post(
        "http://localhost:8080/taskmanager/logout",
        {},
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
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
