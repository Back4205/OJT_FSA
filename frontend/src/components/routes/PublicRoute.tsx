import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PublicRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  return !user ? <Outlet /> : <Navigate to="/taskmanager/dashboard" replace />;
};

export default PublicRoute;
