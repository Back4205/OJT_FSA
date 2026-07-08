import React, { useState } from "react";
import styles from "./LoginForm.module.css";
import SocialLoginButtons from "./SocialLoginButtons";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Logic submit form tĩnh
  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Đang gọi API đăng nhập với:", email, password, "Remember:", rememberMe);
  };

  return (
    <div className={styles['login-wrapper']}>
      <div className={styles['login-card']}>
        {/* Logo & Header */}
        <div className={styles['logo-container']}>
          <div className={styles['logo-box']}>T</div>
        </div>
        <div className={styles['login-header']}>
          <h1>Welcome back</h1>
          <p>Enter your credentials to access your workspace.</p>
        </div>

        {/* Form Đăng nhập */}
        <form onSubmit={handleStandardLogin}>
          <div className={styles['input-group']}>
            <div className={styles['input-header']}>
              <label htmlFor="email">Email</label>
            </div>
            <div className={styles['input-wrapper']}>
              <i className={`bi bi-envelope ${styles['input-icon']}`}></i>
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

          <div className={styles['input-group']}>
            <div className={styles['input-header']}>
              <label htmlFor="password">Password</label>
              <a href="/forgot-password" className={styles['forgot-link']}>
                Forgot?
              </a>
            </div>
            <div className={styles['input-wrapper']}>
              <i className={`bi bi-lock ${styles['input-icon']}`}></i>
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

          <div className={styles['remember-group']}>
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember">Remember me for 30 days</label>
          </div>

          <button type="submit" className={styles['btn-submit']}>
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
        <div className={styles['login-footer']}>
          Don't have an account? <a href="/register">Sign up</a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;