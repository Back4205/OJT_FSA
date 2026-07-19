import React from "react";
import { useAuth } from "../../context/AuthContext";
import WorkspaceAdminDashboard from "./WorkspaceAdminDashboard";
import NoWorkspaceDashboard from "./NoWorkspaceDashboard";
import LogoutButton from "../auth/LogoutButton";

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Vui lòng đăng nhập.</div>;
  }

  // Nếu user chưa có Workspace hoạt động nào, hiển thị màn hình Onboarding (hồ sơ, tham gia hoặc tạo mới)
  if (user.workspaceId === null || user.workspaceId === undefined) {
    return <NoWorkspaceDashboard />;
  }

  // Nếu vai trò của user là WORKSPACE_ADMIN, hiển thị giao diện Workspace Admin Dashboard hoàn chỉnh
  if (user.role === "WORKSPACE_ADMIN") {
    return <WorkspaceAdminDashboard />;
  }

  // Đối với các vai trò khác (MEMBER, LEADER), hiển thị trang Dashboard chuẩn của nhân sự
  return (
    <div className="dashboard" style={{ padding: "40px", fontFamily: "system-ui, sans-serif", maxWidth: "600px", margin: "40px auto", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", textAlign: "left" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "10px" }}>Welcome back, {user.username}!</h1>
      <p style={{ color: "#64748b", marginBottom: "20px" }}>Chào mừng bạn quay lại hệ thống quản lý công việc Flowspace.</p>
      
      <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
        <div style={{ marginBottom: "8px" }}>Email: <strong>{user.email}</strong></div>
        <div style={{ marginBottom: "8px" }}>Workspace hoạt động: <strong>{user.workspaceName || "N/A"}</strong></div>
        <div>Vai trò của bạn: <strong>{user.role}</strong></div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <LogoutButton />
      </div>
    </div>
  );
};

export default Dashboard;
