import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./LoginForm.module.css";
import api from "../../services/api";

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await api.post("/auth/register", formData);
      setSuccessMsg("Registration successful! Please check your email to activate your account.");
      setTimeout(() => {
        navigate("/taskmanager/login");
      }, 2000);
    } catch (error: any) {
      console.error("Detailed server error:", error.response?.data || error.message);
      setErrorMsg(error.response?.data?.message || "Registration failed. Please check your information.");
    }
  };

  return (
    <div className={styles["login-wrapper"]}>
      <div className={styles["login-card"]}>
        {/* Logo & Header */}
        <div className={styles["logo-container"]}>
          <div className={styles["logo-box"]}>Task Manager</div>
        </div>

        <div className={styles["login-header"]}>
          <h1>Create account</h1>
          <p>Get started with your free account today.</p>
        </div>

        {errorMsg && <div className={styles["alert-error"]}>{errorMsg}</div>}
        {successMsg && <div className={styles["alert-success"]}>{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles["input-group"]}>
            <div className={styles["input-header"]}>
              <label htmlFor="username">Username</label>
            </div>
            <div className={styles["input-wrapper"]}>
              <i className={`bi bi-person ${styles["input-icon"]}`}></i>
              <input
                type="text"
                id="username"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles["input-group"]}>
            <div className={styles["input-header"]}>
              <label htmlFor="email">Email</label>
            </div>
            <div className={styles["input-wrapper"]}>
              <i className={`bi bi-envelope ${styles["input-icon"]}`}></i>
              <input
                type="email"
                id="email"
                placeholder="hello@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles["input-group"]}>
            <div className={styles["input-header"]}>
              <label htmlFor="password">Password</label>
            </div>
            <div className={styles["input-wrapper"]}>
              <i className={`bi bi-lock ${styles["input-icon"]}`}></i>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className={styles["btn-submit"]}>
            Sign up
            <i className="bi bi-arrow-right"></i>
          </button>
        </form>

        <div className={styles["login-footer"]}>
          Already have an account? <Link to="/taskmanager/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
