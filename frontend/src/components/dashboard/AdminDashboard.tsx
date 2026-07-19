import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { adminService, type AdminDashboardResponse, type AdminUserSummaryResponse, type AdminWorkspaceSummaryResponse } from "../../services/adminService";
import styles from "./AdminDashboard.module.css";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "bi-speedometer2" },
  { key: "users", label: "Users", icon: "bi-people" },
  { key: "workspaces", label: "Workspaces", icon: "bi-building" },
  { key: "reports", label: "Reports", icon: "bi-graph-up" },
  { key: "settings", label: "Settings", icon: "bi-gear" },
  { key: "activity", label: "Activity", icon: "bi-clock-history" }
] as const;

type TabKey = typeof menuItems[number]["key"];

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [users, setUsers] = useState<AdminUserSummaryResponse[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, usersData, workspacesData] = await Promise.all([
        adminService.getDashboard(),
        adminService.getUsers({ size: 5 }),
        adminService.getWorkspaces({ size: 5 }),
      ]);
      setDashboard(dashboardData);
      setUsers(usersData.content);
      setWorkspaces(workspacesData.content);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const reloadData = async () => {
    await loadDashboard();
  };

  const withAction = async (key: string, action: () => Promise<void>) => {
    setActionLoading(key);
    setError("");
    try {
      await action();
      await reloadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUserStatus = (item: AdminUserSummaryResponse) => {
    const actionKey = `user-status-${item.id}`;
    return withAction(actionKey, async () => {
      if (item.active) {
        await adminService.lockUser(item.id);
      } else {
        await adminService.unlockUser(item.id);
      }
    });
  };

  const handleToggleSuperAdmin = (item: AdminUserSummaryResponse) => {
    const actionKey = `user-super-${item.id}`;
    return withAction(actionKey, async () => {
      await adminService.setSuperAdmin(item.id, !item.superAdmin);
    });
  };

  const handleToggleEmailVerified = (item: AdminUserSummaryResponse) => {
    const actionKey = `user-verified-${item.id}`;
    return withAction(actionKey, async () => {
      await adminService.setUserEmailVerified(item.id, !item.emailVerified);
    });
  };

  const handleResetPassword = (item: AdminUserSummaryResponse) => {
    const nextPassword = window.prompt(`Enter a new password for ${item.username}`, "Admin@1234");
    if (!nextPassword) {
      return;
    }
    if (nextPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const actionKey = `user-password-${item.id}`;
    return withAction(actionKey, async () => {
      await adminService.resetUserPassword(item.id, nextPassword);
    });
  };

  const handleToggleWorkspaceStatus = (item: AdminWorkspaceSummaryResponse) => {
    const actionKey = `workspace-status-${item.id}`;
    return withAction(actionKey, async () => {
      if (item.active) {
        await adminService.lockWorkspace(item.id);
      } else {
        await adminService.unlockWorkspace(item.id);
      }
    });
  };

  const statCards = [
    { label: "Total users", value: dashboard?.totalUsers ?? 0, tone: "indigo" },
    { label: "Active users", value: dashboard?.activeUsers ?? 0, tone: "green" },
    { label: "Workspaces", value: dashboard?.totalWorkspaces ?? 0, tone: "sky" },
    { label: "Memberships", value: dashboard?.totalMemberships ?? 0, tone: "amber" },
  ];
  const currentSectionLabel = menuItems.find((item) => item.key === activeTab)?.label ?? "Dashboard";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>F</div>
          <div>
            <div className={styles.brandTitle}>Flowspace</div>
            <div className={styles.brandSub}>SADMIN</div>
          </div>
        </div>

        <div className={styles.sidebarCard}>
          <div className={styles.workspaceName}>Platform control</div>
          <div className={styles.workspaceMeta}>Manage users and workspaces</div>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${styles.navItem} ${activeTab === item.key ? styles.active : ""}`}
              onClick={() => setActiveTab(item.key)}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button type="button" className={styles.logoutButton} onClick={logout}>
          <i className="bi bi-box-arrow-right" />
          <span>Logout</span>
        </button>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.searchBox}>
            <i className="bi bi-search" />
            <span>Search users, workspaces...</span>
          </div>
          <div className={styles.userChip}>
            <div className={styles.userAvatar}>{(user?.username || "SA").slice(0, 2).toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{user?.username || "Super admin"}</div>
              <div className={styles.userRole}>Super admin</div>
            </div>
          </div>
        </header>

        <section className={styles.content}>
          <div className={styles.headerRow}>
            <div>
              <div className={styles.breadcrumb}>Home / {currentSectionLabel}</div>
              <h1 className={styles.title}>Admin dashboard</h1>
              <p className={styles.subtitle}>Platform-wide control for Sadmin only.</p>
            </div>
            <div className={styles.headerActions}>
              <span className={styles.pill}>Workspace admin</span>
              <span className={styles.pillStrong}>Sadmin</span>
            </div>
          </div>

          {loading && <div className={styles.loading}>Loading dashboard...</div>}
          {error && <div className={styles.error}>{error}</div>}

          {!loading && !error && activeTab === "dashboard" && (
            <>
              <div className={styles.statsGrid}>
                {statCards.map((card) => (
                  <article key={card.label} className={`${styles.statCard} ${styles[card.tone]}`}>
                    <div className={styles.statLabel}>{card.label}</div>
                    <div className={styles.statValue}>{card.value.toLocaleString()}</div>
                  </article>
                ))}
              </div>

              <div className={styles.panelGrid}>
                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h2>Recent users</h2>
                    <span>{users.length} shown</span>
                  </div>
                  <div className={styles.list}>
                    {users.map((item) => (
                      <div key={item.id} className={styles.listRow}>
                        <div>
                          <div className={styles.rowTitle}>{item.username}</div>
                          <div className={styles.rowSub}>{item.email}</div>
                        </div>
                        <div className={styles.badges}>
                          <span className={item.superAdmin ? styles.badgeStrong : styles.badgeSoft}>
                            {item.superAdmin ? "SUPER_ADMIN" : "USER"}
                          </span>
                          <span className={item.active ? styles.badgeGreen : styles.badgeRed}>
                            {item.active ? "Active" : "Locked"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h2>Recent workspaces</h2>
                    <span>{workspaces.length} shown</span>
                  </div>
                  <div className={styles.list}>
                    {workspaces.map((item) => (
                      <div key={item.id} className={styles.listRow}>
                        <div>
                          <div className={styles.rowTitle}>{item.name}</div>
                          <div className={styles.rowSub}>{item.description || "No description"}</div>
                        </div>
                        <div className={styles.badges}>
                          <span className={item.active ? styles.badgeGreen : styles.badgeRed}>
                            {item.active ? "Active" : "Locked"}
                          </span>
                          <span className={styles.badgeSoft}>{item.memberCount} members</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {!loading && !error && activeTab === "users" && (
            <section className={styles.tablePanel}>
              <div className={styles.panelHeader}>
                <h2>Users</h2>
                <span>{users.length} preview rows</span>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td>{item.username}</td>
                      <td>{item.email}</td>
                      <td>
                        <span className={item.active ? styles.badgeGreen : styles.badgeRed}>
                          {item.active ? "Active" : "Locked"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionCell}>
                          <span className={item.superAdmin ? styles.badgeStrong : styles.badgeSoft}>
                            {item.superAdmin ? "SUPER_ADMIN" : "MEMBER"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => handleToggleUserStatus(item)}
                            disabled={actionLoading === `user-status-${item.id}`}
                          >
                            {item.active ? "Lock" : "Unlock"}
                          </button>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => handleToggleSuperAdmin(item)}
                            disabled={actionLoading === `user-super-${item.id}`}
                          >
                            {item.superAdmin ? "Remove Sadmin" : "Make Sadmin"}
                          </button>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => handleToggleEmailVerified(item)}
                            disabled={actionLoading === `user-verified-${item.id}`}
                          >
                            {item.emailVerified ? "Unverify" : "Verify"}
                          </button>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => handleResetPassword(item)}
                            disabled={actionLoading === `user-password-${item.id}`}
                          >
                            Reset password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {!loading && !error && activeTab === "workspaces" && (
            <section className={styles.tablePanel}>
              <div className={styles.panelHeader}>
                <h2>Workspaces</h2>
                <span>{workspaces.length} preview rows</span>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Members</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.description || "No description"}</td>
                      <td>
                        <span className={item.active ? styles.badgeGreen : styles.badgeRed}>
                          {item.active ? "Active" : "Locked"}
                        </span>
                      </td>
                      <td>{item.memberCount}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => handleToggleWorkspaceStatus(item)}
                            disabled={actionLoading === `workspace-status-${item.id}`}
                          >
                            {item.active ? "Lock" : "Unlock"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {!loading && !error && activeTab === "reports" && (
            <div className={styles.reportGrid}>
              <article className={styles.reportCard}>
                <div className={styles.reportLabel}>Locked users</div>
                <div className={styles.reportValue}>{dashboard?.lockedUsers ?? 0}</div>
              </article>
              <article className={styles.reportCard}>
                <div className={styles.reportLabel}>Locked workspaces</div>
                <div className={styles.reportValue}>{dashboard?.lockedWorkspaces ?? 0}</div>
              </article>
              <article className={styles.reportCard}>
                <div className={styles.reportLabel}>Active memberships</div>
                <div className={styles.reportValue}>{dashboard?.activeMemberships ?? 0}</div>
              </article>
            </div>
          )}

          {!loading && !error && activeTab === "settings" && (
            <section className={styles.settingsPanel}>
              <h2>Platform settings</h2>
              <div className={styles.settingsGrid}>
                <div className={styles.settingsItem}>Email verification: enabled</div>
                <div className={styles.settingsItem}>Workspace creation: enabled</div>
                <div className={styles.settingsItem}>Member invitations: enabled</div>
                <div className={styles.settingsItem}>Role scope: super admin only</div>
              </div>
            </section>
          )}

          {!loading && !error && activeTab === "activity" && (
            <section className={styles.timelinePanel}>
              <h2>Activity log</h2>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div>
                    <div className={styles.rowTitle}>Admin dashboard loaded</div>
                    <div className={styles.rowSub}>Current session is {user?.username || "unknown"}</div>
                  </div>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div>
                    <div className={styles.rowTitle}>Users preview fetched</div>
                    <div className={styles.rowSub}>{users.length} users visible in the current page</div>
                  </div>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div>
                    <div className={styles.rowTitle}>Workspace preview fetched</div>
                    <div className={styles.rowSub}>{workspaces.length} workspaces visible in the current page</div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
