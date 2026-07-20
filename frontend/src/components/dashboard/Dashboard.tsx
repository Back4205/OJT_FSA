import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { workspaceService } from "../../services/workspaceService";
import AdminDashboard from "./AdminDashboard";
import LeaderDashboard from "./LeaderDashboard";
import MemberDashboard from "./MemberDashboard";
import NoWorkspaceDashboard from "./NoWorkspaceDashboard";
import WorkspaceAdminDashboard from "./WorkspaceAdminDashboard";

const Dashboard: React.FC = () => {
  const { user, checkAuth } = useAuth();
  const [resolvingWorkspace, setResolvingWorkspace] = useState(false);

  useEffect(() => {
    const openLatestWorkspace = async () => {
      if (!user || user.role === "SUPER_ADMIN" || user.workspaceId) {
        setResolvingWorkspace(false);
        return;
      }

      setResolvingWorkspace(true);
      try {
        const workspaces = await workspaceService.getUserWorkspaces();
        const latestWorkspace = workspaces[0];

        if (latestWorkspace) {
          await workspaceService.switchWorkspace(latestWorkspace.workspaceId);
          await checkAuth();
        }
      } catch {
        // Keep the user on onboarding if workspace lookup or switching fails.
      } finally {
        setResolvingWorkspace(false);
      }
    };

    void openLatestWorkspace();
  }, [checkAuth, user]);

  if (!user) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Vui lòng đăng nhập.</div>;
  }

  if (user.role === "SUPER_ADMIN") {
    return <AdminDashboard />;
  }

  if (resolvingWorkspace) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Đang mở workspace gần nhất...
      </div>
    );
  }

  if (!user.workspaceId) {
    return <NoWorkspaceDashboard />;
  }

  if (user.role === "LEADER") {
    return <LeaderDashboard />;
  }

  if (user.role === "WORKSPACE_ADMIN") {
    return <WorkspaceAdminDashboard />;
  }

  return <MemberDashboard />;
};

export default Dashboard;
