import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "../home/HomePage";
import LoginForm from "../auth/LoginForm";
import RegisterForm from "../auth/RegisterForm";
import ForgotPasswordForm from "../auth/ForgotPasswordForm";
import ResetPasswordForm from "../auth/ResetPasswordForm";
import Dashboard from "../dashboard/Dashboard";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/taskmanager" element={<HomePage />} />

      <Route element={<PublicRoute />}>
        <Route path="/taskmanager/login" element={<LoginForm />} />
        <Route path="/taskmanager/register" element={<RegisterForm />} />
        <Route path="/taskmanager/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/taskmanager/reset-password" element={<ResetPasswordForm />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/taskmanager/dashboard" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/taskmanager" replace />} />
    </Routes>
  );
};

export default AppRoutes;