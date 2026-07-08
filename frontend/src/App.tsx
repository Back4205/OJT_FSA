// import { useState } from "react";
// import { useEffect } from "react";
// import "./App.css";
// import api from "./services/api";
// function App() {
//   const [message, setMessage] = useState<string>("");

//   useEffect(() => {
//     api
//       .get("/test")
//       .then((res) => setMessage(res.data))
//       .catch((err) => console.error(err));
//   }, []);

//   return (
//     <div>
//       <h1>Task Management</h1>
//       <p> {message}</p>
//     </div>
//   );
// }

// export default App;
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "./services/api";
import LoginForm from "./components/auth/LoginForm";
import "./App.css";
import LogoutButton from "./components/auth/LogoutButton";
import RegisterForm from "./components/auth/RegisterForm";

// Định nghĩa kiểu dữ liệu User trả về từ Spring Boot
interface User {
  name: string;
  email: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Hàm kiểm tra session hiện tại
    const fetchUser = async () => {
      try {
        console.log("Đang kiểm tra đăng nhập...");
        const response = await api.get("/auth/me");
        setUser(response.data.data);
      } catch (error) {
        console.log("Người dùng chưa đăng nhập hoặc phiên đã hết hạn.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Hiển thị màn hình loading tạm trong lúc chờ check API
  if (loading) {
    return <div className="loading">Đang tải dữ liệu...</div>;
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          {/* 1. Trang Dashboard */}
          <Route
            path="/taskmanager/dashboard"
            element={
              user ? (
                <DashboardContent user={user} />
              ) : (
                <Navigate to="/taskmanager" />
              )
            }
          />

          {/* 2. Trang Login */}
          <Route
            path="/taskmanager"
            element={
              !user ? <LoginForm /> : <Navigate to="/taskmanager/dashboard" />
            }
          />

          {/* 3. Trang Register  */}
          <Route path="/taskmanager/register" element={<RegisterForm />} />

          {/* 4. Redirect mặc định */}
          <Route path="*" element={<Navigate to="/taskmanager" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// Tách Dashboard thành component riêng cho dễ quản lý
const DashboardContent = ({ user }: { user: User }) => (
  <div className="dashboard">
    <h1>Chào mừng, {user.name}!</h1>
    <p>Tài khoản: {user.email}</p>
    <LogoutButton />
  </div>
);

export default App;
