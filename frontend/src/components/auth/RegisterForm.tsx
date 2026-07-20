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
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Kiểm tra mật khẩu xác nhận
    if (formData.password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không trùng khớp!");
      return;
    }

    try {
      await api.post("/auth/register", formData);
      setSuccessMsg("Đăng ký tài khoản thành công! Vui lòng kiểm tra hộp thư email để kích hoạt tài khoản.");
      setTimeout(() => {
        navigate("/taskmanager");
      }, 3000);
    } catch (error: any) {
      console.error("Detailed server error:", error.response?.data || error.message);
      setErrorMsg(error.response?.data?.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
    }
  };

  return (
    <div className={styles["login-container-page"]}>
      
      {/* CỘT TRÁI: FORM ĐĂNG KÝ MOCKUP */}
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
            <h1>Create your workspace</h1>
            <p>Start your 14-day trial. No credit card required.</p>
          </div>

          {/* Các thông báo phản hồi lỗi / thành công */}
          {errorMsg && <div className={styles["alert-error"]}>{errorMsg}</div>}
          {successMsg && <div className={styles["alert-success"]}>{successMsg}</div>}

          {/* Form đăng ký */}
          <form onSubmit={handleSubmit} className={styles["standard-form"]}>
            
            {/* Trường nhập Full name (username) */}
            <div className={styles["input-field-group"]}>
              <label htmlFor="username">Full name</label>
              <input
                type="text"
                id="username"
                placeholder="Maya Jensen"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            {/* Trường nhập Work email (email) */}
            <div className={styles["input-field-group"]}>
              <label htmlFor="email">Work email</label>
              <input
                type="email"
                id="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Khối nhập Password và Confirm song song */}
            <div className={styles["row-input-group"]}>
              <div className={styles["input-field-group"]}>
                <label htmlFor="password">Password</label>
                <div className={styles["password-input-wrapper"]}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className={styles["password-toggle-btn"]}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                  </button>
                </div>
              </div>

              <div className={styles["input-field-group"]}>
                <label htmlFor="confirmPassword">Confirm</label>
                <div className={styles["password-input-wrapper"]}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles["password-toggle-btn"]}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Các yêu cầu mật khẩu ở dưới */}
            <ul className={styles["password-requirements-list"]}>
              <li>At least 8 characters</li>
              <li>A number and a symbol</li>
              <li>Mixed case letters</li>
            </ul>

            {/* Nút gửi tạo tài khoản */}
            <button type="submit" className={styles["btn-sign-in-mockup"]} style={{ marginTop: "8px" }}>
              Create account
            </button>
          </form>

          {/* Cam kết điều khoản */}
          <div className={styles["agreement-text"]}>
            By continuing, you agree to our Terms and Privacy Policy.
          </div>

          {/* Dòng liên kết sang đăng nhập */}
          <div className={styles["create-account-prompt"]}>
            Already have an account? <Link to="/taskmanager">Sign in</Link>
          </div>

          {/* Footer chân trang cột trái */}
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

          {/* Danh ngôn */}
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

          {/* Chỉ số metrics */}
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

export default RegisterForm;
