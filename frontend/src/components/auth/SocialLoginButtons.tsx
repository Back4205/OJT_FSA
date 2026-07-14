import React from "react";
import GoogleIcon from "../../assets/Icon/GoogleIcon";
import GithubIcon from "../../assets/Icon/GithubIcon";
import styles from "./LoginForm.module.css";

const SocialLoginButtons: React.FC = () => {
  // Đưa logic chuyển hướng vào đây để file LoginForm gọn hơn
  const handleGoogleLogin = () => {
    window.location.href =
      "http://localhost:8080/taskmanager/oauth2/authorization/google";
  };

  const handleGithubLogin = () => {
    window.location.href =
      "http://localhost:8080/taskmanager/oauth2/authorization/github";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Nút Đăng nhập Google */}
      <button
        type="button"
        className={styles["btn-google"]}
        onClick={handleGoogleLogin}
      >
        <GoogleIcon />
        Google
      </button>

      {/* Nút Đăng nhập GitHub */}
      <button
        type="button"
        className={styles["btn-google"]}
        onClick={handleGithubLogin}
      >
        <GithubIcon />
        GitHub
      </button>
    </div>
  );
};

export default SocialLoginButtons;
