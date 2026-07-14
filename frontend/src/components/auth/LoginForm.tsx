import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./LoginForm.module.css";
import SocialLoginButtons from "./SocialLoginButtons";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const navigate = useNavigate();
  const { login, verifyOtp } = useAuth();

  // OTP states
  const [otpMode, setOtpMode] = useState<boolean>(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Load saved credentials if Remember Me was selected previously
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

  // Check URL parameters for verified/errors status from email activation links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    const error = params.get("error");
    if (verified === "true") {
      setSuccessMsg("Your account has been successfully verified. Please log in!");
    } else if (error) {
      setErrorMsg(`Verification failed: ${decodeURIComponent(error)}`);
    }
  }, []);

  // Timer countdown for resending
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

      // Handle Remember Me storage
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
        setSuccessMsg("An OTP code has been sent to your email.");
        setResendCooldown(60); // 60s cooldown
      } else {
        alert("Login successful");
        navigate("/taskmanager/dashboard");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.message ?? "Invalid email or password.");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);

    // Auto-focus next input
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
      alert("Login successful!");
      navigate("/taskmanager/dashboard");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? "Invalid or expired OTP code.");
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
      setErrorMsg(err.response?.data?.message ?? "Could not resend OTP code.");
    }
  };

  return (
    <div className={styles["login-wrapper"]}>
      <div className={styles["login-card"]}>
        {/* Logo & Header */}
        <div className={styles["logo-container"]}>
          <div className={styles["logo-box"]}>Task Manager</div>
        </div>

        {errorMsg && <div className={styles["alert-error"]}>{errorMsg}</div>}
        {successMsg && <div className={styles["alert-success"]}>{successMsg}</div>}

        {!otpMode ? (
          <>
            <div className={styles["login-header"]}>
              <h1>Welcome back</h1>
              <p>Enter your credentials to access your workspace.</p>
            </div>

            {/* Form Đăng nhập */}
            <form onSubmit={handleStandardLogin}>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles["input-group"]}>
                <div className={styles["input-header"]}>
                  <label htmlFor="password">Password</label>
                  <Link to="/taskmanager/forgot-password" className={styles["forgot-link"]}>
                    Forgot?
                  </Link>
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
                  />
                </div>
              </div>

              <div className={styles["remember-group"]}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember">Remember me</label>
              </div>

              <button type="submit" className={styles["btn-submit"]}>
                Sign in
                <i className="bi bi-arrow-right"></i>
              </button>
            </form>

            <div className={styles.divider}>
              <span>OR CONTINUE WITH</span>
            </div>

            {/* Gọi component 2 nút đăng nhập mạng xã hội vào đây */}
            <SocialLoginButtons />

            {/* Footer Link Đăng ký */}
            <div className={styles["login-footer"]}>
              Don't have an account? <Link to="/taskmanager/register">Sign up</Link>
            </div>
          </>
        ) : (
          <>
            <div className={styles["login-header"]}>
              <h1>Two-Factor Verification</h1>
              <p>A 6-digit security code has been sent to <strong>{email}</strong>.</p>
            </div>

            <form onSubmit={handleOtpSubmit}>
              <div className={styles["otp-container"]}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    className={styles["otp-input"]}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    required
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <button type="submit" className={styles["btn-submit"]}>
                Verify OTP
                <i className="bi bi-check2-circle"></i>
              </button>
            </form>

            <div className={styles["resend-box"]}>
              Didn't receive code?{" "}
              <button
                type="button"
                className={styles["resend-btn"]}
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>

            <button
              type="button"
              className={styles["back-btn"]}
              onClick={() => {
                setOtpMode(false);
                setErrorMsg("");
                setSuccessMsg("");
              }}
            >
              <i className="bi bi-arrow-left"></i> Go back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginForm;
