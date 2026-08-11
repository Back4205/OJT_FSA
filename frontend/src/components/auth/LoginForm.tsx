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

  const [otpMode, setOtpMode] = useState<boolean>(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    const error = params.get("error");
    if (verified === "true") {
      setSuccessMsg("Your account has been activated successfully. Please sign in.");
    } else if (error) {
      setErrorMsg(`Account activation failed: ${decodeURIComponent(error)}`);
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const result = await login(email, password);

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
        setSuccessMsg("A security OTP code has been sent to your email.");
        setResendCooldown(60);
      } else {
        navigate("/taskmanager/dashboard");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.message ?? "Email or password is incorrect.");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      setErrorMsg("Please enter all 6 OTP digits.");
      return;
    }
    try {
      await verifyOtp(email, otpCode);
      navigate("/taskmanager/dashboard");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? "The OTP code is incorrect or expired.");
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      setErrorMsg("");
      setSuccessMsg("");
      await api.post("/auth/login", { email, password });
      setSuccessMsg("A new OTP code has been sent to your email.");
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? "Unable to resend the OTP code.");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/taskmanager/oauth2/authorization/google";
  };

  const handleGithubLogin = () => {
    window.location.href = "/taskmanager/oauth2/authorization/github";
  };

  return (
    <div className={styles["login-container-page"]}>
      

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

          <div className={styles["login-header"]}>
            <h1>Welcome back</h1>
            <p>Sign in to continue to your workspace.</p>
          </div>

          {errorMsg && <div className={styles["alert-error"]}>{errorMsg}</div>}
          {successMsg && <div className={styles["alert-success"]}>{successMsg}</div>}

          {!otpMode ? (
            <>

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

              <div className={styles["or-divider"]}>
                <span>OR</span>
              </div>

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

              <div className={styles["create-account-prompt"]}>
                Don't have an account? <Link to="/taskmanager/register">Create one</Link>
              </div>
            </>
          ) : (
            <>

              <div className={styles["login-header"]}>
                <h1>Verify your email</h1>
                <p>We sent a 6-digit code to {email || "you@company.com"}.</p>
              </div>

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

          <div className={styles["mockup-footer"]}>
            <span>© 2026 Flowspace, Inc. · Privacy · Terms</span>
          </div>

        </div>
      </div>

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

          <div className={styles["testimonial-quote"]}>
            "Flowspace replaced Jira, Notion and Linear for our engineering org. We ship 2x faster."
          </div>

          <div className={styles["testimonial-author"]}>
            <div className={styles["author-avatar"]}></div>
            <div className={styles["author-info"]}>
              <div className={styles["author-name"]}>Priya Ravindran</div>
              <div className={styles["author-title"]}>Head of Engineering · Northwind</div>
            </div>
          </div>

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
