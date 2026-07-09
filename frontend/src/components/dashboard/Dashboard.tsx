import React from "react";
import LogoutButton from "../auth/LogoutButton";
import { useAuth } from "../../context/AuthContext";

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard">
      <h1>Chào mừng, {user.name}!</h1>
      <p>Tài khoản: {user.email}</p>
      <LogoutButton />
    </div>
  );
};

export default Dashboard;
