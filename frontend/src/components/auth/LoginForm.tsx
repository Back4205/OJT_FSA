import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./LoginForm.module.css";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const navigate = useNavigate();
  const { login, verifyOtp } = useAuth();

  // Các trạng thái xác thực hai lớp OTP
  const [otpMode, setOtpMode] = useState<boolean>(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Khôi phục thông tin đăng nhập đã lưu từ trước (Nếu chọn Remember Me)
  useEffect(() => {
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";
    if (savedRememberMe) {
      const savedEmail = localStorage.getItem("rememberEmail") || "";
      const savedPassword = localStorage.getItem("rememberPassword") || "";
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  // Kiểm tra tham số trên URL để xử lý xác thực email qua link kích hoạt
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    const error = params.get("error");
    if (verified === "true") {
      setSuccessMsg("Tài khoản của bạn đã được kích hoạt thành công. Vui lòng đăng nhập!");
    } else if (error) {
      setErrorMsg(`Kích hoạt tài khoản thất bại: ${decodeURIComponent(error)}`);
    }
  }, []);

  // Bộ đếm thời gian cooldown cho việc gửi lại mã OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Đăng nhập tài khoản tiêu chuẩn
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const result = await login(email, password);

      // Lưu trữ tài khoản nếu chọn Remember Me
      if (rememberMe) {
        localStorage.setItem("rememberEmail", email);
        localStorage.setItem("rememberPassword", password);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberEmail");
        localStorage.removeItem("rememberPassword");
        localStorage.setItem("rememberMe", "false");
      }

      if (result && result.otpRequired) {
        setOtpMode(true);
        setSuccessMsg("Mã kiểm tra bảo mật OTP đã được gửi đến email của bạn.");
        setResendCooldown(60); // Đặt thời gian cooldown 60 giây
      } else {
        navigate("/taskmanager/dashboard");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.message ?? "Email hoặc mật khẩu không chính xác.");
    }
  };

  // Tăng hiệu quả trải nghiệm nhập mã OTP
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);

    // Tự động nhảy sang ô nhập tiếp theo
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  // Nhấn Backspace để quay lại ô trước
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  // Xác thực mã OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      setErrorMsg("Vui lòng nhập đầy đủ 6 chữ số OTP.");
      return;
    }
    try {
      await verifyOtp(email, otpCode);
      navigate("/taskmanager/dashboard");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? "Mã OTP không chính xác hoặc đã hết hạn.");
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      setErrorMsg("");
      setSuccessMsg("");
      await api.post("/auth/login", { email, password });
      setSuccessMsg("Mã OTP mới đã được gửi vào email của bạn.");
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? "Không thể gửi lại mã OTP.");
    }
  };

  // Chuyển hướng đăng nhập OAuth2 Google và GitHub của Backend cũ
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8080/taskmanager/oauth2/authorization/google";
  };

  const handleGithubLogin = () => {
    window.location.href = "http://localhost:8080/taskmanager/oauth2/authorization/github";
  };

  return (
    <div className={styles["login-container-page"]}>
      
      {/* CỘT TRÁI: FORM ĐĂNG NHẬP MOCKUP */}
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

          {/* Tiêu đề */}
          <div className={styles["login-header"]}>
            <h1>Welcome back</h1>
            <p>Sign in to continue to your workspace.</p>
          </div>

          {/* Các thông báo lỗi/thành công */}
          {errorMsg && <div className={styles["alert-error"]}>{errorMsg}</div>}
          {successMsg && <div className={styles["alert-success"]}>{successMsg}</div>}

          {!otpMode ? (
            <>
              {/* Nút đăng nhập liên kết Google & GitHub */}
              <div className={styles["social-buttons-wrapper"]}>
                <button
                  type="button"
                  className={styles["btn-social-mockup"]}
                  onClick={handleGoogleLogin}
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    className={styles["social-icon-img"]}
                    alt="Google Logo"
                  />
                  Continue with Google
                </button>

                <button
                  type="button"
                  className={styles["btn-social-mockup"]}
                  onClick={handleGithubLogin}
                >
                  <img
                    src="https://www.svgrepo.com/show/512317/github-142.svg"
                    className={styles["social-icon-img-github"]}
                    alt="GitHub Logo"
                  />
                  Continue with GitHub
                </button>
              </div>

              {/* Bộ chia OR */}
              <div className={styles["or-divider"]}>
                <span>OR</span>
              </div>

              {/* Form nhập tài khoản mật khẩu tiêu chuẩn */}
              <form onSubmit={handleStandardLogin} className={styles["standard-form"]}>
                <div className={styles["input-field-group"]}>
                  <label htmlFor="email">Work email</label>
                  <input
                    type="email"
                    id="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles["input-field-group"]}>
                  <div className={styles["password-label-row"]}>
                    <label htmlFor="password">Password</label>
                    <Link to="/taskmanager/forgot-password" className={styles["forgot-pwd-link"]}>
                      Forgot password?
                    </Link>
                  </div>
                  <div className={styles["password-input-wrapper"]}>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                <div className={styles["remember-row"]}>
                  <label className={styles["checkbox-container"]}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className={styles["checkbox-checkmark"]}></span>
                    Remember me 
                  </label>
                </div>

                <button type="submit" className={styles["btn-sign-in-mockup"]}>
                  Sign in
                </button>
              </form>

              {/* Hướng dẫn tạo tài khoản mới */}
              <div className={styles["create-account-prompt"]}>
                Don't have an account? <Link to="/taskmanager/register">Create one</Link>
              </div>
            </>
          ) : (
            <>
              {/* Giao diện xác thực OTP Email dựa theo mockup */}
              <div className={styles["login-header"]}>
                <h1>Verify your email</h1>
                <p>We sent a 6-digit code to {email || "you@company.com"}.</p>
              </div>

              {/* Banner gợi ý màu xanh lá */}
              <div className={styles["otp-banner-card"]}>
                <div className={styles["otp-banner-icon-box"]}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <div className={styles["otp-banner-text"]}>
                  Almost there — enter the code to activate your workspace.
                </div>
              </div>

              <form onSubmit={handleOtpSubmit} className={styles["standard-form"]}>
                {/* 6 ô nhập dạng liền khối thống nhất */}
                <div className={styles["otp-inputs-unified"]}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      className={styles["otp-box-digit"]}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      required
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                <button type="submit" className={styles["btn-sign-in-mockup"]}>
                  Verify email
                </button>
              </form>

              {/* Chân trang OTP liên kết gửi lại mã / quay lại trang login */}
              <div className={styles["otp-footer-row"]}>
                Didn't get it?{" "}
                <button
                  type="button"
                  className={styles["otp-footer-link"]}
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                </button>
                <span className={styles["otp-footer-separator"]}>·</span>
                <button
                  type="button"
                  className={styles["otp-footer-link"]}
                  onClick={() => {
                    setOtpMode(false);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                >
                  Back to sign in
                </button>
              </div>
            </>
          )}

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

          {/* Danh ngôn bình chọn */}
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

          {/* Biểu thống kê metrics */}
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

export default LoginForm;
