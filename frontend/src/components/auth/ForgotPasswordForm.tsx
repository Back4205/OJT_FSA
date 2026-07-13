import React, { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./LoginForm.module.css";
import api from "../../services/api";

const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setSuccessMsg("Request sent! Please check your inbox for the password reset link.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Could not find an account with this email.");
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
          <h1>Reset Password</h1>
          <p>Enter your email address and we will send you a password reset link.</p>
        </div>

        {errorMsg && <div className={styles["alert-error"]}>{errorMsg}</div>}
        {successMsg && <div className={styles["alert-success"]}>{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles["input-group"]}>
            <div className={styles["input-header"]}>
              <label htmlFor="email">Email Address</label>
            </div>
            <div className={styles["input-wrapper"]}>
              <i className={`bi bi-envelope ${styles["input-icon"]}`}></i>
              <input
                type="email"
                id="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className={styles["btn-submit"]} disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
            {!loading && <i className="bi bi-send"></i>}
          </button>
        </form>

        <div className={styles["login-footer"]}>
          <Link to="/taskmanager">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
