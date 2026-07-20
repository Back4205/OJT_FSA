import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { workspaceService } from "../../services/workspaceService";
import type { UserWorkspaceResponse } from "../../services/workspaceService";
import styles from "./NoWorkspaceDashboard.module.css";

const WORKSPACE_ENTRY_MODE_KEY = "taskmanager.workspace.entry-mode";

const NoWorkspaceDashboard: React.FC = () => {
  const { user, logout, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<"join" | "create" | "workspaces" | "profile">("join");
  
  // Form states
  const [inviteCode, setInviteCode] = useState<string>("");
  const [newWsName, setNewWsName] = useState<string>("");
  const [newWsDesc, setNewWsDesc] = useState<string>("");

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [workspacesLoading, setWorkspacesLoading] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const [workspaceSwitchingId, setWorkspaceSwitchingId] = useState<number | null>(null);
  const [userWorkspaces, setUserWorkspaces] = useState<UserWorkspaceResponse[]>([]);

  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg("");
        setErrorMsg("");
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await workspaceService.getUserWorkspaces();
        setUserWorkspaces(data);
      } catch {
        setUserWorkspaces([]);
      } finally {
        setWorkspacesLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

  // Join workspace handler
  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setErrorMsg("Vui lòng nhập mã mời hợp lệ.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await workspaceService.joinWorkspace(inviteCode.trim());
      setSuccessMsg("Tham gia Workspace thành công! Đang chuyển hướng...");
      setInviteCode("");
      await checkAuth(); // Đồng bộ trạng thái user
      setTimeout(() => {
        window.location.reload(); // Tải lại trang để cập nhật JWT context mới
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể tham gia Workspace. Vui lòng kiểm tra lại mã mời.");
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) {
      setErrorMsg("Tên Workspace không được để trống.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await workspaceService.createWorkspace(newWsName.trim(), newWsDesc.trim());
      setSuccessMsg("Khởi tạo Workspace mới thành công! Đang chuyển hướng...");
      setNewWsName("");
      setNewWsDesc("");
      await checkAuth();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Tạo Workspace thất bại. Vui lòng thử một tên khác.");
      setLoading(false);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: number) => {
    if (workspaceSwitchingId === workspaceId) {
      return;
    }

    setWorkspaceSwitchingId(workspaceId);
    setErrorMsg("");
    try {
      localStorage.setItem(WORKSPACE_ENTRY_MODE_KEY, "workspace");
      await workspaceService.switchWorkspace(workspaceId);
      await checkAuth();
      setSuccessMsg("Đã chuyển sang workspace đã chọn.");
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Chuyển workspace thất bại.");
      localStorage.removeItem(WORKSPACE_ENTRY_MODE_KEY);
      setWorkspaceSwitchingId(null);
    }
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return "?";
    const parts = fullName.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  if (loading && (successMsg.includes("thành công") || successMsg.includes("chuyển hướng"))) {
    return (
      <div className={styles["spinner-container"]}>
        <div className={styles["spinner"]}></div>
        <p className={styles["spinner-text"]}>Đang đồng bộ không gian làm việc mới...</p>
      </div>
    );
  }

  return (
    <div className={styles["admin-layout"]}>
      {/* SIDEBAR */}
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
          <div
            className={`${styles["menu-item"]} ${activeTab === "join" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("join")}
          >
            <i className={`bi bi-key-fill ${styles["menu-item-icon"]}`}></i>
            <span>Join workspace</span>
          </div>

          <div
            className={`${styles["menu-item"]} ${activeTab === "create" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("create")}
          >
            <i className={`bi bi-plus-circle-fill ${styles["menu-item-icon"]}`}></i>
            <span>Create workspace</span>
          </div>

          <div
            className={`${styles["menu-item"]} ${activeTab === "workspaces" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("workspaces")}
          >
            <i className={`bi bi-grid-3x3-gap-fill ${styles["menu-item-icon"]}`}></i>
            <span>My workspaces</span>
          </div>

          <div
            className={`${styles["menu-item"]} ${activeTab === "profile" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <i className={`bi bi-person-fill ${styles["menu-item-icon"]}`}></i>
            <span>My Profile</span>
          </div>
        </nav>

        <div className={styles["sidebar-footer"]}>
          <button className={styles["logout-btn"]} onClick={logout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className={styles["main-area"]}>
        <header className={styles["topbar"]}>
          <div className={styles["topbar-actions"]}>
            {/* User Dropdown trigger */}
            <div style={{ position: "relative" }}>
              <button
                className={styles["user-profile-trigger"]}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className={styles["user-avatar"]}>
                  {getInitials(user?.username || "U")}
                </div>
                <div className={styles["user-meta"]}>
                  <span className={styles["user-name"]}>{user?.username || "Account"}</span>
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

          {/* TAB 1: JOIN WORKSPACE */}
          {activeTab === "join" && (
            <>
              <div className={styles["page-header"]}>
                <h1 className={styles["header-title"]}>Gia nhập Workspace</h1>
                <p className={styles["header-subtitle"]}>Nhập mã mời do Quản trị viên cung cấp để tham gia làm việc cùng đội nhóm.</p>
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
                      onChange={(e) => setInviteCode(e.target.value)}
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

          {/* TAB 2: CREATE WORKSPACE */}
          {activeTab === "create" && (
            <>
              <div className={styles["page-header"]}>
                <h1 className={styles["header-title"]}>Tạo Workspace mới</h1>
                <p className={styles["header-subtitle"]}>Khởi tạo một tổ chức/doanh nghiệp mới của riêng bạn trên hệ thống Flowspace.</p>
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
                      onChange={(e) => setNewWsName(e.target.value)}
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
                      onChange={(e) => setNewWsDesc(e.target.value)}
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

          {/* TAB 3: MY WORKSPACES */}
          {activeTab === "workspaces" && (
            <>
              <div className={styles["page-header"]}>
                <h1 className={styles["header-title"]}>My workspaces</h1>
                <p className={styles["header-subtitle"]}>Chọn một workspace để chuyển sang vai trò tương ứng trong workspace đó.</p>
              </div>

              <div className={styles["workspace-section"]}>
                <div className={styles["workspace-list"]}>
                  {workspacesLoading && <div className={styles["workspace-empty"]}>Đang tải danh sách workspace...</div>}

                  {!workspacesLoading && userWorkspaces.length === 0 && (
                    <div className={styles["workspace-empty"]}>Bạn chưa tham gia workspace nào.</div>
                  )}

                  {userWorkspaces.map((workspace) => (
                    <button
                      key={workspace.workspaceId}
                      type="button"
                      className={styles["workspace-card"]}
                      onClick={() => void handleSwitchWorkspace(workspace.workspaceId)}
                      disabled={workspaceSwitchingId === workspace.workspaceId}
                    >
                      <div className={styles["workspace-card-main"]}>
                        <div className={styles["workspace-card-title"]}>{workspace.workspaceName}</div>
                        <div className={styles["workspace-card-role"]}>{workspace.roleName}</div>
                      </div>
                      <span className={styles["workspace-card-action"]}>
                        {workspaceSwitchingId === workspace.workspaceId ? "Switching..." : "Open"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === "profile" && (
            <>
              <div className={styles["page-header"]}>
                <h1 className={styles["header-title"]}>Hồ sơ cá nhân</h1>
                <p className={styles["header-subtitle"]}>Thông tin liên hệ và phân quyền tài khoản của bạn.</p>
              </div>

              <div className={styles["profile-card-container"]}>
                <div className={styles["profile-avatar-large"]}>
                  {getInitials(user?.username || "U")}
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
                    Không gian làm việc: <em style={{ color: "#64748b" }}>Chưa tham gia Workspace nào</em>
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
