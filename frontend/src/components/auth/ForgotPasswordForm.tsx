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
      setSuccessMsg("Yêu cầu thành công! Vui lòng kiểm tra hộp thư email để nhận đường dẫn đặt lại mật khẩu.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không tìm thấy tài khoản liên kết với email này.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles["login-container-page"]}>
      
      {/* CỘT TRÁI: FORM QUÊN MẬT KHẨU MOCKUP */}
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
            <h1>Forgot Password</h1>
            <p>Enter your email address and we will send you a password reset link.</p>
          </div>

          {/* Alert thông báo lỗi / thành công */}
          {errorMsg && <div className={styles["alert-error"]}>{errorMsg}</div>}
          {successMsg && <div className={styles["alert-success"]}>{successMsg}</div>}

          {/* Form gửi email khôi phục */}
          <form onSubmit={handleSubmit} className={styles["standard-form"]}>
            <div className={styles["input-field-group"]}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className={styles["btn-sign-in-mockup"]} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          {/* Dòng liên kết quay lại đăng nhập */}
          <div className={styles["create-account-prompt"]}>
            <Link to="/taskmanager/login">Back to sign in</Link>
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

          {/* Lời trích dẫn */}
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

export default ForgotPasswordForm;
