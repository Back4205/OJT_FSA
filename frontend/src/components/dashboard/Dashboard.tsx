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
      <h1>Welcome, {user.name}!</h1>
      <p>Account: {user.email}</p>
      <LogoutButton />
    </div>
  );
};

export default Dashboard;
