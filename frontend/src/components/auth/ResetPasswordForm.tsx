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
  
  // Trạng thái hiển thị mật khẩu
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  const navigate = useNavigate();

  // Trích xuất token khôi phục từ URL tham số ?token=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenVal = params.get("token") || "";
    setToken(tokenVal);
    if (!tokenVal) {
      setErrorMsg("Đường dẫn khôi phục mật khẩu không khả dụng hoặc đã thay đổi.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!token) {
      setErrorMsg("Mã token không hợp lệ.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccessMsg("Thay đổi mật khẩu thành công! Đang tự động chuyển hướng đăng nhập...");
      setTimeout(() => {
        navigate("/taskmanager");
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Khôi phục mật khẩu thất bại. Token liên kết đã hết hiệu lực.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles["login-container-page"]}>
      
      {/* CỘT TRÁI: FORM THIẾT LẬP MẬT KHẨU MỚI MOCKUP */}
      <div className={styles["login-left-column"]}>
        <div className={styles["login-form-area"]}>
          
          {/* Logo Flowspace */}
          <div className={styles["brand-logo"]}>
            <div className={styles["brand-icon-wrapper"]}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#4F46E5" />
              </svg>
            </div>
            <div className={styles["brand-text"]}>
              <span className={styles["brand-name"]}>Flowspace</span>
              <span className={styles["brand-sub"]}>TASK OS</span>
            </div>
          </div>

          {/* Tiêu đề & phụ đề */}
          <div className={styles["login-header"]}>
            <h1>Setup New Password</h1>
            <p>Please enter your new password below to recover your account.</p>
          </div>

          {/* Alert thông báo lỗi / thành công */}
          {errorMsg && <div className={styles["alert-error"]}>{errorMsg}</div>}
          {successMsg && <div className={styles["alert-success"]}>{successMsg}</div>}

          {/* Form đổi mật khẩu mới */}
          <form onSubmit={handleSubmit} className={styles["standard-form"]}>
            
            {/* Nhập mật khẩu mới */}
            <div className={styles["input-field-group"]}>
              <label htmlFor="password">New Password</label>
              <div className={styles["password-input-wrapper"]}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || !token}
                />
                <button
                  type="button"
                  className={styles["password-toggle-btn"]}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || !token}
                  tabIndex={-1}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div className={styles["input-field-group"]}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={styles["password-input-wrapper"]}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading || !token}
                />
                <button
                  type="button"
                  className={styles["password-toggle-btn"]}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading || !token}
                  tabIndex={-1}
                >
                  <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>

            <button type="submit" className={styles["btn-sign-in-mockup"]} disabled={loading || !token}>
              {loading ? "Processing..." : "Reset password"}
            </button>
          </form>

          {/* Dòng liên kết quay lại đăng nhập */}
          <div className={styles["create-account-prompt"]}>
            <Link to="/taskmanager">Back to sign in</Link>
          </div>

          {/* Footer chân trang */}
          <div className={styles["mockup-footer"]}>
            <span>© 2026 Flowspace, Inc. · Privacy · Terms</span>
          </div>

        </div>
      </div>

      {/* CỘT PHẢI: TESTIMONIAL & STATS MOCKUP (CHỈ HIỂN THỊ TRÊN DESKTOP) */}
      <div className={styles["login-right-column"]}>
        <div className={styles["right-content-wrapper"]}>
          
          <div className={styles["trusted-header"]}>
            TRUSTED BY 40,000+ TEAMS
          </div>

          {/* Card Mockup Sprint */}
          <div className={styles["sprint-card"]}>
            <div className={styles["sprint-card-header"]}>
              <span className={styles["check-badge"]}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
              <span className={styles["sprint-card-tag"]}>Sprint 42 · shipped</span>
            </div>
            
            <div className={styles["sprint-card-title"]}>
              Migrate billing to new gateway
            </div>

            <div className={styles["progress-bar-container"]}>
              <div className={styles["progress-bar-fill"]} style={{ width: "82%" }}></div>
              <span className={styles["progress-percent"]}>82%</span>
            </div>
          </div>

          {/* Quy trình */}
          <div className={styles["testimonial-quote"]}>
            "Flowspace replaced Jira, Notion and Linear for our engineering org. We ship 2x faster."
          </div>

          {/* Tác giả */}
          <div className={styles["testimonial-author"]}>
            <div className={styles["author-avatar"]}></div>
            <div className={styles["author-info"]}>
              <div className={styles["author-name"]}>Priya Ravindran</div>
              <div className={styles["author-title"]}>Head of Engineering · Northwind</div>
            </div>
          </div>

          {/* Chỉ số metric */}
          <div className={styles["stats-row"]}>
            <div className={styles["stat-item"]}>
              <div className={styles["stat-number"]}>2.4M</div>
              <div className={styles["stat-label"]}>tasks completed</div>
            </div>
            <div className={styles["stat-item"]}>
              <div className={styles["stat-number"]}>99.99%</div>
              <div className={styles["stat-label"]}>uptime</div>
            </div>
            <div className={styles["stat-item"]}>
              <div className={styles["stat-number"]}>4.9/5</div>
              <div className={styles["stat-label"]}>customer rating</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default ResetPasswordForm;
