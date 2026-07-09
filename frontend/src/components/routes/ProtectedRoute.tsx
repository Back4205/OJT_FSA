import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Đang tải dữ liệu...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/taskmanager" replace />;
};

export default ProtectedRoute;
