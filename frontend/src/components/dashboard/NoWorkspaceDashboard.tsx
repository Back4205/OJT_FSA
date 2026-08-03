import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { workspaceService } from "../../services/workspaceService";
import styles from "./NoWorkspaceDashboard.module.css";

const NoWorkspaceDashboard: React.FC = () => {
  const { user, logout, checkAuth, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"join" | "create" | "profile">("join");
  const [inviteCode, setInviteCode] = useState("");
  const [newWsName, setNewWsName] = useState("");
  const [newWsDesc, setNewWsDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Profile update states
  const [profileUsername, setProfileUsername] = useState<string>(user?.username || "");
  const [profilePassword, setProfilePassword] = useState<string>("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string>("");
  const [profileError, setProfileError] = useState<string>("");

  useEffect(() => {
    if (user) {
      setProfileUsername(user.username);
    }
  }, [user]);

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess("");
    setProfileError("");

    if (!profileUsername.trim()) {
      setProfileError("Display name is required.");
      return;
    }

    if (profilePassword) {
      if (profilePassword.length < 6) {
        setProfileError("Password must be at least 6 characters.");
        return;
      }
      if (profilePassword !== profileConfirmPassword) {
        setProfileError("Password confirmation does not match.");
        return;
      }
    }

    setProfileLoading(true);
    try {
      await updateProfile(profileUsername.trim(), profilePassword);
      setProfileSuccess("Profile updated successfully.");
      setProfilePassword("");
      setProfileConfirmPassword("");
    } catch (err: any) {
      setProfileError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

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
      setErrorMsg("Please enter a valid invitation code.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await workspaceService.joinWorkspace(inviteCode.trim());
      setSuccessMsg("Join request sent. Please wait for workspace admin approval.");
      setInviteCode("");
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Cannot join workspace. Please check the invitation code.");
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newWsName.trim()) {
      setErrorMsg("Workspace name is required.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await workspaceService.createWorkspace(newWsName.trim(), newWsDesc.trim());
      setSuccessMsg("Workspace created successfully. Redirecting to the dashboard...");
      setNewWsName("");
      setNewWsDesc("");
      await checkAuth();
      window.setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to create workspace. Please try another name.");
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
        <p className={styles["spinner-text"]}>Syncing workspace...</p>
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
                <h1 className={styles["header-title"]}>Join Workspace</h1>
                <p className={styles["header-subtitle"]}>
                  Enter the invitation code provided by your administrator to join your team.
                </p>
              </div>

              <div className={styles["card-form-container"]}>
                <form onSubmit={handleJoinWorkspace}>
                  <div className={styles["form-group"]}>
                    <label htmlFor="invite-code-input">Workspace Invitation Code</label>
                    <input
                      type="text"
                      id="invite-code-input"
                      className={styles["form-control"]}
                      placeholder="Example: WS-A2B4C6D8"
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
                    {loading ? "Processing..." : "Join workspace"}
                  </button>
                </form>
              </div>
            </>
          )}

          {activeTab === "create" && (
            <>
              <div className={styles["page-header"]}>
                <h1 className={styles["header-title"]}>Create New Workspace</h1>
                <p className={styles["header-subtitle"]}>
                  Start a new organization or business workspace on Flowspace.
                </p>
              </div>

              <div className={styles["card-form-container"]}>
                <form onSubmit={handleCreateWorkspace}>
                  <div className={styles["form-group"]}>
                    <label htmlFor="workspace-name-input">Business / Organization Name</label>
                    <input
                      type="text"
                      id="workspace-name-input"
                      className={styles["form-control"]}
                      placeholder="Example: Acme, FPT Software,..."
                      value={newWsName}
                      onChange={(event) => setNewWsName(event.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className={styles["form-group"]}>
                    <label htmlFor="workspace-desc-input">Detailed Description (Optional)</label>
                    <textarea
                      id="workspace-desc-input"
                      className={styles["form-textarea"]}
                      placeholder="Describe the organization's goals..."
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
                    {loading ? "Creating..." : "Create workspace"}
                  </button>
                </form>
              </div>
            </>
          )}

          {activeTab === "profile" && (
            <>
              <div className={styles["page-header"]}>
                <h1 className={styles["header-title"]}>Personal Profile</h1>
                <p className={styles["header-subtitle"]}>
                  Contact information and account details.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px", alignItems: "start" }}>
                {/* Left Card: Read-only summary */}
                <div className={styles["profile-card-container"]} style={{ margin: 0, padding: "24px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div className={styles["profile-avatar-large"]} style={{ width: "90px", height: "90px", fontSize: "1.8rem", marginBottom: "16px" }}>
                    {getInitials(user?.username || user?.email || "U")}
                  </div>

                  <div className={styles["profile-details"]} style={{ width: "100%", textAlign: "left" }}>
                    <h2 className={styles["profile-name"]} style={{ textAlign: "center", marginBottom: "20px", fontSize: "1.25rem", color: "#0f172a" }}>
                      {user?.username || "Flowspace member"}
                    </h2>

                    <div className={styles["profile-meta-item"]} style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px dashed #e2e8f0" }}>
                      <span style={{ color: "#64748b", fontSize: "0.8rem", display: "block" }}>Linked email</span>
                      <strong>{user?.email}</strong>
                    </div>

                    <div className={styles["profile-meta-item"]} style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px dashed #e2e8f0" }}>
                      <span style={{ color: "#64748b", fontSize: "0.8rem", display: "block" }}>Current role (limited access)</span>
                      <strong style={{ color: "var(--admin-primary)" }}>{user?.role}</strong>
                    </div>

                    <div className={styles["profile-meta-item"]}>
                      <span style={{ color: "#64748b", fontSize: "0.8rem", display: "block" }}>Workspace</span>
                      <em style={{ color: "#64748b" }}>No workspace joined yet</em>
                    </div>
                  </div>
                </div>

                {/* Right Card: Update Profile form */}
                <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                    Update personal information
                  </h3>

                  {user?.provider !== "LOCAL" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px", color: "#d97706", fontSize: "0.82rem", fontWeight: 500 }}>
                      <i className="bi bi-info-circle-fill" style={{ fontSize: "0.95rem" }}></i>
                      <span>This account signs in with {user?.provider || "a social provider"}. Password changes are not available here.</span>
                    </div>
                  )}

                  {profileSuccess && (
                    <div className={`${styles["alert-box"]} ${styles["alert-success"]}`} style={{ marginBottom: "16px", padding: "10px" }}>
                      <i className="bi bi-check-circle-fill"></i>
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  {profileError && (
                    <div className={`${styles["alert-box"]} ${styles["alert-error"]}`} style={{ marginBottom: "16px", padding: "10px" }}>
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <span>{profileError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfileSubmit}>
                    <div className={styles["form-group"]} style={{ marginBottom: "16px" }}>
                      <label htmlFor="profile-username" style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>
                        Display name / Full name
                      </label>
                      <input
                        type="text"
                        id="profile-username"
                        className={styles["form-control"]}
                        value={profileUsername}
                        onChange={(e) => setProfileUsername(e.target.value)}
                        required
                        placeholder="Enter your display name"
                      />
                    </div>

                    {user?.provider === "LOCAL" && (
                      <>
                        <div className={styles["form-group"]} style={{ marginBottom: "16px" }}>
                          <label htmlFor="profile-password" style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>
                            New password (leave blank to keep current)
                          </label>
                          <input
                            type="password"
                            id="profile-password"
                            className={styles["form-control"]}
                            value={profilePassword}
                            onChange={(e) => setProfilePassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                          />
                        </div>

                        <div className={styles["form-group"]} style={{ marginBottom: "20px" }}>
                          <label htmlFor="profile-confirm-password" style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>
                            Confirm new password
                          </label>
                          <input
                            type="password"
                            id="profile-confirm-password"
                            className={styles["form-control"]}
                            value={profileConfirmPassword}
                            onChange={(e) => setProfileConfirmPassword(e.target.value)}
                            placeholder="Re-enter the new password"
                          />
                        </div>
                      </>
                    )}

                    <button type="submit" className={styles["btn-primary"]} style={{ width: "100%", justifyContent: "center", height: "40px" }} disabled={profileLoading}>
                      {profileLoading ? (
                        <span>Updating...</span>
                      ) : (
                        <>
                          <i className="bi bi-person-check-fill" style={{ marginRight: "6px" }}></i>
                          <span>Save information</span>
                        </>
                      )}
                    </button>
                  </form>
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
