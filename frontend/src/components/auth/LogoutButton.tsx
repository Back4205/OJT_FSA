import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const LogoutButton: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Lỗi khi đăng xuất:", e);
    } finally {
      navigate("/taskmanager", { replace: true });
      window.location.reload();
    }
  };

  return <button onClick={handleLogout}>Đăng xuất</button>;
};

export default LogoutButton;