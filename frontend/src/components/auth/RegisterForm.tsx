import { useState } from "react";
import api from "../../services/api";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/auth/register", formData);
      console.log("Đăng ký thành công:", response.data);
      alert("Đăng ký thành công!");
    } catch (error: any) {
      // Sửa dòng này để biết lỗi là gì
      console.error(
        "Lỗi chi tiết từ server:",
        error.response?.data || error.message,
      );
      alert("Lỗi: " + (error.response?.data?.message || "Kiểm tra console!"));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "300px",
        gap: "10px",
      }}
    >
      <h2>Register Account</h2>
      <input
        type="text"
        placeholder="username"
        required
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        required
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        required
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
      />
      <button type="submit">Register Account</button>
    </form>
  );
};

export default RegisterForm;
