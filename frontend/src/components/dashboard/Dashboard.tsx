import React from "react";
import { useAuth } from "../../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import MemberDashboard from "./MemberDashboard";
import NoWorkspaceDashboard from "./NoWorkspaceDashboard";
import WorkspaceAdminDashboard from "./WorkspaceAdminDashboard";

const WORKSPACE_ENTRY_MODE_KEY = "taskmanager.workspace.entry-mode";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const workspaceEntryMode = localStorage.getItem(WORKSPACE_ENTRY_MODE_KEY);

  if (!user) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Vui lòng đăng nhập.</div>;
  }

  if (user.role === "SUPER_ADMIN") {
    return <AdminDashboard />;
  }

  if (workspaceEntryMode !== "workspace") {
    return <NoWorkspaceDashboard />;
  }

  if (user.role === "WORKSPACE_ADMIN") {
    return <WorkspaceAdminDashboard />;
  }

  return <MemberDashboard />;
};

export default Dashboard;
