import React from "react";
import { useAuth } from "../../context/AuthContext";
import WorkspaceAdminDashboard from "./WorkspaceAdminDashboard";
import LeaderDashboard from "./LeaderDashboard";
import NoWorkspaceDashboard from "./NoWorkspaceDashboard";
import LogoutButton from "../auth/LogoutButton";

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Vui lòng đăng nhập.</div>;
  }

  // Nếu user chưa có Workspace hoạt động nào, hiển thị màn hình Onboarding
  if (user.workspaceId === null || user.workspaceId === undefined) {
    return <NoWorkspaceDashboard />;
  }

  // WORKSPACE_ADMIN → dashboard quản trị
  if (user.role === "WORKSPACE_ADMIN") {
    return <WorkspaceAdminDashboard />;
  }

  // LEADER & MEMBER → dùng chung dashboard
  if (user.role === "LEADER" || user.role === "MEMBER") {
    return <LeaderDashboard />;
  }

  // Các role khác nếu có
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      Unknown role: {user.role}
      <br/>
      <LogoutButton />
    </div>
  );
};

export default Dashboard;
