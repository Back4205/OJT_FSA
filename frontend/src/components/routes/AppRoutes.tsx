import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "../auth/LoginForm";
import RegisterForm from "../auth/RegisterForm";
import Dashboard from "../dashboard/Dashboard";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Các tuyến dành cho khách chưa đăng nhập */}
      <Route element={<PublicRoute />}>
        <Route path="/taskmanager" element={<LoginForm />} />
        <Route path="/taskmanager/register" element={<RegisterForm />} />
      </Route>

      {/* Các tuyến yêu cầu người dùng phải đăng nhập */}
      <Route element={<ProtectedRoute />}>
        <Route path="/taskmanager/dashboard" element={<Dashboard />} />
      </Route>

      {/* Tự động điều hướng các tuyến đường khác về trang chính */}
      <Route path="*" element={<Navigate to="/taskmanager" replace />} />
    </Routes>
  );
};

export default AppRoutes;
