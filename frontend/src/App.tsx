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
import { useEffect, useState } from "react";
import api from "./services/api";
import LoginForm from "./components/auth/LoginForm";
import "./App.css";


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
        const response = await api.get("/api/auth/me");
        setUser(response.data);
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
    <div className="app-container">
      {user ? (
        // Nếu đã đăng nhập thì show Dashboard/Thông tin
        <div className="dashboard">
          <h1>Chào mừng, {user.name}!</h1>
          <p>Tài khoản: {user.email}</p>

          {/* Nút đăng xuất sẽ gọi endpoint logout mặc định của Spring Security */}
          <button
            onClick={() =>
              (window.location.href =
                "http://localhost:8080/taskmanager/logout")
            }
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        // Nếu chưa đăng nhập thì show Component LoginForm
        <LoginForm />
      )}
    </div>
  );
}

export default App;
