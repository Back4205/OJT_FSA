import React from "react";
import { useAuth } from "../../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import MemberDashboard from "./MemberDashboard";
import NoWorkspaceDashboard from "./NoWorkspaceDashboard";

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Vui lòng đăng nhập.</div>;
  }

  if (user.role === "SUPER_ADMIN") {
    return <AdminDashboard />;
  }

  if (!user.workspaceId) {
    return <NoWorkspaceDashboard />;
  }

  return <MemberDashboard />;
};

export default Dashboard;
