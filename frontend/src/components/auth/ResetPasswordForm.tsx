import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./LoginForm.module.css";
import api from "../../services/api";

const ResetPasswordForm: React.FC = () => {
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const navigate = useNavigate();

  // Extract token from URL match ?token=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenVal = params.get("token") || "";
    setToken(tokenVal);
    if (!tokenVal) {
      setErrorMsg("Password reset token is missing or invalid.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!token) {
      setErrorMsg("Invalid token.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccessMsg("Password changed successfully! Redirecting to login page...");
      setTimeout(() => {
        navigate("/taskmanager");
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Reset password failed. Token may have expired.");
    } finally {
      setLoading(false);
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
          <h1>Setup New Password</h1>
          <p>Please enter your new password below.</p>
        </div>

        {errorMsg && <div className={styles["alert-error"]}>{errorMsg}</div>}
        {successMsg && <div className={styles["alert-success"]}>{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles["input-group"]}>
            <div className={styles["input-header"]}>
              <label htmlFor="password">New Password</label>
            </div>
            <div className={styles["input-wrapper"]}>
              <i className={`bi bi-lock ${styles["input-icon"]}`}></i>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || !token}
              />
            </div>
          </div>

          <div className={styles["input-group"]}>
            <div className={styles["input-header"]}>
              <label htmlFor="confirmPassword">Confirm Password</label>
            </div>
            <div className={styles["input-wrapper"]}>
              <i className={`bi bi-lock-fill ${styles["input-icon"]}`}></i>
              <input
                type="password"
                id="confirmPassword"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || !token}
              />
            </div>
          </div>

          <button type="submit" className={styles["btn-submit"]} disabled={loading || !token}>
            {loading ? "Processing..." : "Reset password"}
            {!loading && <i className="bi bi-shield-lock"></i>}
          </button>
        </form>

        <div className={styles["login-footer"]}>
          <Link to="/taskmanager/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;
