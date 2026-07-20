import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { workspaceService } from "../../services/workspaceService";
import styles from "./NoWorkspaceDashboard.module.css";

const NoWorkspaceDashboard: React.FC = () => {
  const { user, logout, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<"join" | "create" | "profile">("join");
  const [inviteCode, setInviteCode] = useState("");
  const [newWsName, setNewWsName] = useState("");
  const [newWsDesc, setNewWsDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    if (!successMsg && !errorMsg) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMsg("");
      setErrorMsg("");
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [successMsg, errorMsg]);

  const handleJoinWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteCode.trim()) {
      setErrorMsg("Vui lòng nhập mã mời hợp lệ.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await workspaceService.joinWorkspace(inviteCode.trim());
      setSuccessMsg("Tham gia workspace thành công. Đang chuyển đến dashboard...");
      setInviteCode("");
      await checkAuth();
      window.setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể tham gia workspace. Vui lòng kiểm tra lại mã mời.");
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newWsName.trim()) {
      setErrorMsg("Tên workspace không được để trống.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await workspaceService.createWorkspace(newWsName.trim(), newWsDesc.trim());
      setSuccessMsg("Tạo workspace thành công. Đang chuyển đến dashboard...");
      setNewWsName("");
      setNewWsDesc("");
      await checkAuth();
      window.setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Tạo workspace thất bại. Vui lòng thử tên khác.");
      setLoading(false);
    }
  };

  const getInitials = (fullName: string) => {
    if (!fullName) {
      return "?";
    }

    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  if (loading && successMsg) {
    return (
      <div className={styles["spinner-container"]}>
        <div className={styles["spinner"]}></div>
        <p className={styles["spinner-text"]}>Đang đồng bộ workspace...</p>
      </div>
    );
  }

  return (
    <div className={styles["admin-layout"]}>
      <aside className={styles["sidebar"]}>
        <div className={styles["sidebar-header"]}>
          <div className={styles["logo-container"]}>
            <div className={styles["logo-icon"]}>F</div>
            <div className={styles["logo-meta"]}>
              <span className={styles["logo-text"]}>Flowspace</span>
              <span className={styles["logo-sub"]}>Onboarding</span>
            </div>
          </div>
        </div>

        <nav className={styles["sidebar-menu"]}>
          <button
            type="button"
            className={`${styles["menu-item"]} ${activeTab === "join" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("join")}
          >
            <i className={`bi bi-key-fill ${styles["menu-item-icon"]}`}></i>
            <span>Join workspace</span>
          </button>

          <button
            type="button"
            className={`${styles["menu-item"]} ${activeTab === "create" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("create")}
          >
            <i className={`bi bi-plus-circle-fill ${styles["menu-item-icon"]}`}></i>
            <span>Create workspace</span>
          </button>

          <button
            type="button"
            className={`${styles["menu-item"]} ${activeTab === "profile" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <i className={`bi bi-person-fill ${styles["menu-item-icon"]}`}></i>
            <span>My Profile</span>
          </button>
        </nav>

        <div className={styles["sidebar-footer"]}>
          <button className={styles["logout-btn"]} onClick={logout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className={styles["main-area"]}>
        <header className={styles["topbar"]}>
          <div className={styles["topbar-actions"]}>
            <div style={{ position: "relative" }}>
              <button
                className={styles["user-profile-trigger"]}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className={styles["user-avatar"]}>
                  {getInitials(user?.username || user?.email || "U")}
                </div>
                <div className={styles["user-meta"]}>
                  <span className={styles["user-name"]}>{user?.username || user?.email || "Account"}</span>
                  <span className={styles["user-role"]}>No workspace</span>
                </div>
                <i className="bi bi-chevron-down" style={{ fontSize: "0.75rem", color: "#64748b" }}></i>
              </button>
            </div>
          </div>
        </header>

        <section className={styles["content-body"]}>
          {successMsg && (
            <div className={`${styles["alert-box"]} ${styles["alert-success"]}`}>
              <i className="bi bi-check-circle-fill"></i>
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className={`${styles["alert-box"]} ${styles["alert-error"]}`}>
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === "join" && (
            <>
              <div className={styles["page-header"]}>
                <h1 className={styles["header-title"]}>Gia nhập Workspace</h1>
                <p className={styles["header-subtitle"]}>
                  Nhập mã mời do quản trị viên cung cấp để tham gia làm việc cùng đội nhóm.
                </p>
              </div>

              <div className={styles["card-form-container"]}>
                <form onSubmit={handleJoinWorkspace}>
                  <div className={styles["form-group"]}>
                    <label htmlFor="invite-code-input">Mã mời Workspace (Invitation Key)</label>
                    <input
                      type="text"
                      id="invite-code-input"
                      className={styles["form-control"]}
                      placeholder="Ví dụ: GOOGLE123 hoặc WS-A2B4C6D8"
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles["btn-primary"]}
                    disabled={loading || !inviteCode.trim()}
                  >
                    {loading ? "Đang xử lý..." : "Tham gia không gian làm việc"}
                  </button>
                </form>
              </div>
            </>
          )}

          {activeTab === "create" && (
            <>
              <div className={styles["page-header"]}>
                <h1 className={styles["header-title"]}>Tạo Workspace mới</h1>
                <p className={styles["header-subtitle"]}>
                  Khởi tạo một tổ chức/doanh nghiệp mới của riêng bạn trên Flowspace.
                </p>
              </div>

              <div className={styles["card-form-container"]}>
                <form onSubmit={handleCreateWorkspace}>
                  <div className={styles["form-group"]}>
                    <label htmlFor="workspace-name-input">Tên doanh nghiệp / Tổ chức</label>
                    <input
                      type="text"
                      id="workspace-name-input"
                      className={styles["form-control"]}
                      placeholder="Ví dụ: Vinamilk, FPT Software,..."
                      value={newWsName}
                      onChange={(event) => setNewWsName(event.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className={styles["form-group"]}>
                    <label htmlFor="workspace-desc-input">Mô tả chi tiết (Tùy chọn)</label>
                    <textarea
                      id="workspace-desc-input"
                      className={styles["form-textarea"]}
                      placeholder="Mô tả mục tiêu hoạt động của tổ chức..."
                      value={newWsDesc}
                      onChange={(event) => setNewWsDesc(event.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles["btn-primary"]}
                    disabled={loading || !newWsName.trim()}
                  >
                    {loading ? "Đang khởi tạo..." : "Tạo mới Workspace"}
                  </button>
                </form>
              </div>
            </>
          )}

          {activeTab === "profile" && (
            <>
              <div className={styles["page-header"]}>
                <h1 className={styles["header-title"]}>Hồ sơ cá nhân</h1>
                <p className={styles["header-subtitle"]}>
                  Thông tin liên hệ và phân quyền tài khoản của bạn.
                </p>
              </div>

              <div className={styles["profile-card-container"]}>
                <div className={styles["profile-avatar-large"]}>
                  {getInitials(user?.username || user?.email || "U")}
                </div>

                <div className={styles["profile-details"]}>
                  <h2 className={styles["profile-name"]}>{user?.username || "Flowspace member"}</h2>
                  <div className={styles["profile-meta-item"]}>
                    Email liên kết: <strong>{user?.email}</strong>
                  </div>
                  <div className={styles["profile-meta-item"]}>
                    Vai trò hiện tại: <strong>{user?.role}</strong>
                  </div>
                  <div className={styles["profile-meta-item"]}>
                    Không gian làm việc: <em style={{ color: "#64748b" }}>Chưa tham gia workspace nào</em>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default NoWorkspaceDashboard;
