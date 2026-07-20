import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  adminService,
  type AdminDashboardResponse,
  type AdminMembershipResponse,
  type AdminUserDetailResponse,
  type AdminUserSummaryResponse,
  type AdminWorkspaceDetailResponse,
  type AdminWorkspaceSummaryResponse
} from "../../services/adminService";
import styles from "./AdminDashboard.module.css";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "bi-speedometer2" },
  { key: "users", label: "Users", icon: "bi-people" },
  { key: "workspaces", label: "Workspaces", icon: "bi-building" },
  { key: "reports", label: "Reports", icon: "bi-graph-up" },
  { key: "activity", label: "Activity", icon: "bi-clock-history" }
] as const;

type TabKey = typeof menuItems[number]["key"];

type PageInfo = {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

type DetailTarget = {
  type: "user" | "workspace";
  id: number;
};

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [previewUsers, setPreviewUsers] = useState<AdminUserSummaryResponse[]>([]);
  const [previewWorkspaces, setPreviewWorkspaces] = useState<AdminWorkspaceSummaryResponse[]>([]);
  const [users, setUsers] = useState<AdminUserSummaryResponse[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userSearchDraft, setUserSearchDraft] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userActiveFilter, setUserActiveFilter] = useState<"all" | "active" | "locked">("all");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "super" | "member">("all");
  const [userPage, setUserPage] = useState(0);
  const [userPageInfo, setUserPageInfo] = useState<PageInfo>({
    pageNumber: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 1,
    first: true,
    last: true
  });
  const [workspaceSearchDraft, setWorkspaceSearchDraft] = useState("");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [workspaceActiveFilter, setWorkspaceActiveFilter] = useState<"all" | "active" | "locked">("all");
  const [workspacePage, setWorkspacePage] = useState(0);
  const [workspacePageInfo, setWorkspacePageInfo] = useState<PageInfo>({
    pageNumber: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 1,
    first: true,
    last: true
  });
  const [notice, setNotice] = useState("");
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetailResponse | null>(null);
  const [workspaceDetail, setWorkspaceDetail] = useState<AdminWorkspaceDetailResponse | null>(null);
  const [userMemberships, setUserMemberships] = useState<AdminMembershipResponse[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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
      setPreviewUsers(usersData.content);
      setPreviewWorkspaces(workspacesData.content);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminService.getUsers({
        search: userSearch || undefined,
        active:
          userActiveFilter === "all" ? undefined : userActiveFilter === "active",
        superAdmin:
          userRoleFilter === "all" ? undefined : userRoleFilter === "super",
        page: userPage,
        size: userPageInfo.pageSize
      });
      setUsers(response.content);
      setUserPageInfo({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalElements: response.totalElements,
        totalPages: response.totalPages,
        first: response.first,
        last: response.last
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminService.getWorkspaces({
        search: workspaceSearch || undefined,
        active:
          workspaceActiveFilter === "all" ? undefined : workspaceActiveFilter === "active",
        page: workspacePage,
        size: workspacePageInfo.pageSize
      });
      setWorkspaces(response.content);
      setWorkspacePageInfo({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalElements: response.totalElements,
        totalPages: response.totalPages,
        first: response.first,
        last: response.last
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load workspaces.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userSearch, userActiveFilter, userRoleFilter, userPage]);

  useEffect(() => {
    if (activeTab === "workspaces") {
      loadWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, workspaceSearch, workspaceActiveFilter, workspacePage]);

  const openUserDetail = async (userId: number) => {
    setDetailTarget({ type: "user", id: userId });
    setDetailLoading(true);
    setError("");
    setNotice("");
    try {
      const [detail, memberships] = await Promise.all([
        adminService.getUser(userId),
        adminService.getUserMemberships(userId, { size: 100 })
      ]);
      setUserDetail(detail);
      setUserMemberships(memberships.content);
      setWorkspaceDetail(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load user details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openWorkspaceDetail = async (workspaceId: number) => {
    setDetailTarget({ type: "workspace", id: workspaceId });
    setDetailLoading(true);
    setError("");
    setNotice("");
    try {
      const detail = await adminService.getWorkspace(workspaceId);
      setWorkspaceDetail(detail);
      setUserDetail(null);
      setUserMemberships([]);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load workspace details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailPanel = () => {
    setDetailTarget(null);
    setUserDetail(null);
    setWorkspaceDetail(null);
    setUserMemberships([]);
  };

  const refreshVisibleSection = async () => {
    await loadDashboard();
    if (activeTab === "users") {
      await loadUsers();
    }
    if (activeTab === "workspaces") {
      await loadWorkspaces();
    }
  };

  const refreshOpenDetail = async () => {
    if (detailTarget?.type === "user") {
      await openUserDetail(detailTarget.id);
    }
    if (detailTarget?.type === "workspace") {
      await openWorkspaceDetail(detailTarget.id);
    }
  };

  const withAction = async (key: string, action: () => Promise<void>, successMessage?: string) => {
    setActionLoading(key);
    setError("");
    setNotice("");
    try {
      await action();
      await refreshVisibleSection();
      if (detailTarget) {
        await refreshOpenDetail();
      }
      if (successMessage) {
        setNotice(successMessage);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err?.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUserStatus = (item: AdminUserSummaryResponse) => {
    if (item.email.trim().toLowerCase() === currentUserEmail) {
      setError("You cannot lock or unlock your own account from this screen.");
      return;
    }
    const nextAction = item.active ? "lock" : "unlock";
    if (!window.confirm(`Do you want to ${nextAction} user ${item.username}?`)) {
      return;
    }
    const actionKey = `user-status-${item.id}`;
    return withAction(actionKey, async () => {
      if (item.active) {
        await adminService.lockUser(item.id);
      } else {
        await adminService.unlockUser(item.id);
      }
    }, `User ${item.username} ${item.active ? "locked" : "unlocked"} successfully.`);
  };

  const handleToggleEmailVerified = (item: AdminUserSummaryResponse) => {
    if (!window.confirm(`${item.emailVerified ? "Unverify" : "Verify"} email for ${item.username}?`)) {
      return;
    }
    const actionKey = `user-verified-${item.id}`;
    return withAction(actionKey, async () => {
      await adminService.setUserEmailVerified(item.id, !item.emailVerified);
    }, `Updated email verification for ${item.username}.`);
  };

  const handleResetPassword = (item: AdminUserSummaryResponse) => {
    if (item.email.trim().toLowerCase() === currentUserEmail) {
      setError("Please reset your own password from the account flow, not from Sadmin actions.");
      return;
    }
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
    }, `Password updated for ${item.username}.`);
  };

  const handleToggleWorkspaceStatus = (item: AdminWorkspaceSummaryResponse) => {
    if (!window.confirm(`Do you want to ${item.active ? "lock" : "unlock"} workspace ${item.name}?`)) {
      return;
    }
    const actionKey = `workspace-status-${item.id}`;
    return withAction(actionKey, async () => {
      if (item.active) {
        await adminService.lockWorkspace(item.id);
      } else {
        await adminService.unlockWorkspace(item.id);
      }
    }, `Workspace ${item.name} ${item.active ? "locked" : "unlocked"} successfully.`);
  };

  const applyUserFilters = () => {
    setUserPage(0);
    setUserSearch(userSearchDraft.trim());
  };

  const resetUserFilters = () => {
    setUserSearchDraft("");
    setUserSearch("");
    setUserActiveFilter("all");
    setUserRoleFilter("all");
    setUserPage(0);
  };

  const applyWorkspaceFilters = () => {
    setWorkspacePage(0);
    setWorkspaceSearch(workspaceSearchDraft.trim());
  };

  const resetWorkspaceFilters = () => {
    setWorkspaceSearchDraft("");
    setWorkspaceSearch("");
    setWorkspaceActiveFilter("all");
    setWorkspacePage(0);
  };

  const statCards = [
    { label: "Total users", value: dashboard?.totalUsers ?? 0, tone: "indigo" },
    { label: "Active users", value: dashboard?.activeUsers ?? 0, tone: "green" },
    { label: "Workspaces", value: dashboard?.totalWorkspaces ?? 0, tone: "sky" },
    { label: "Memberships", value: dashboard?.totalMemberships ?? 0, tone: "amber" },
  ];
  const currentSectionLabel = menuItems.find((item) => item.key === activeTab)?.label ?? "Dashboard";
  const selectedUserSummary = userDetail
    ? ({
        id: userDetail.id,
        username: userDetail.username,
        email: userDetail.email,
        provider: userDetail.provider,
        active: userDetail.active,
        superAdmin: userDetail.superAdmin,
        emailVerified: userDetail.emailVerified,
        membershipCount: userDetail.membershipCount
      } as AdminUserSummaryResponse)
    : null;
  const selectedWorkspaceSummary = workspaceDetail
    ? ({
        id: workspaceDetail.id,
        name: workspaceDetail.name,
        description: workspaceDetail.description,
        active: workspaceDetail.active
      } as AdminWorkspaceSummaryResponse)
    : null;
  const currentUserEmail = user?.email?.trim().toLowerCase() ?? "";
  const isSelectedUserSelf = selectedUserSummary?.email.trim().toLowerCase() === currentUserEmail;

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

          {notice && <div className={styles.notice}>{notice}</div>}

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
                    <span>{previewUsers.length} shown</span>
                  </div>
                  <div className={styles.list}>
                    {previewUsers.map((item) => (
                      (() => {
                        const isSelf = item.email.trim().toLowerCase() === currentUserEmail;
                        return (
                      <div key={item.id} className={styles.listRow}>
                        <div className={styles.rowInfo}>
                          <button type="button" className={styles.linkButton} onClick={() => openUserDetail(item.id)}>
                            {item.username}
                          </button>
                          <div className={styles.rowSub}>{item.email}</div>
                        </div>
                        <div className={styles.badges}>
                          <span className={item.superAdmin ? styles.badgeStrong : styles.badgeSoft}>
                            {item.superAdmin ? "SUPER_ADMIN" : "USER"}
                          </span>
                          <span className={item.active ? styles.badgeGreen : styles.badgeRed}>
                            {item.active ? "Active" : "Locked"}
                          </span>
                          <button type="button" className={styles.actionButton} onClick={() => openUserDetail(item.id)}>
                            Details
                          </button>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => handleToggleUserStatus(item)}
                            disabled={isSelf || actionLoading === `user-status-${item.id}`}
                            title={isSelf ? "You cannot lock your own account" : undefined}
                          >
                            {item.active ? "Lock" : "Unlock"}
                          </button>
                        </div>
                      </div>
                        );
                      })()
                    ))}
                  </div>
                </section>

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h2>Recent workspaces</h2>
                    <span>{previewWorkspaces.length} shown</span>
                  </div>
                  <div className={styles.list}>
                    {previewWorkspaces.map((item) => (
                      <div key={item.id} className={styles.listRow}>
                        <div className={styles.rowInfo}>
                          <button type="button" className={styles.linkButton} onClick={() => openWorkspaceDetail(item.id)}>
                            {item.name}
                          </button>
                          <div className={styles.rowSub}>{item.description || "No description"}</div>
                        </div>
                        <div className={styles.badges}>
                          <span className={item.active ? styles.badgeGreen : styles.badgeRed}>
                            {item.active ? "Active" : "Locked"}
                          </span>
                          <button type="button" className={styles.actionButton} onClick={() => openWorkspaceDetail(item.id)}>
                            Details
                          </button>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => handleToggleWorkspaceStatus(item)}
                            disabled={actionLoading === `workspace-status-${item.id}`}
                          >
                            {item.active ? "Lock" : "Unlock"}
                          </button>
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
              <div className={styles.filterBar}>
                <input
                  className={styles.filterInput}
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearchDraft}
                  onChange={(e) => setUserSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyUserFilters();
                    }
                  }}
                />
                <select
                  className={styles.filterSelect}
                  value={userActiveFilter}
                  onChange={(e) => setUserActiveFilter(e.target.value as "all" | "active" | "locked")}
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="locked">Locked</option>
                </select>
                <select
                  className={styles.filterSelect}
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as "all" | "super" | "member")}
                >
                  <option value="all">All roles</option>
                  <option value="super">Sadmin</option>
                  <option value="member">Member</option>
                </select>
                <button type="button" className={styles.filterButton} onClick={applyUserFilters}>
                  Apply
                </button>
                <button type="button" className={styles.filterButtonSecondary} onClick={resetUserFilters}>
                  Reset
                </button>
              </div>
              <div className={styles.panelHeader}>
                <h2>Users</h2>
                <span>{userPageInfo.totalElements} total</span>
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
                      (() => {
                        const isSelf = item.email.trim().toLowerCase() === currentUserEmail;
                        return (
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
                            onClick={() => openUserDetail(item.id)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => handleToggleUserStatus(item)}
                            disabled={isSelf || actionLoading === `user-status-${item.id}`}
                            title={isSelf ? "You cannot lock your own account" : undefined}
                          >
                            {item.active ? "Lock" : "Unlock"}
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
                            disabled={isSelf || actionLoading === `user-password-${item.id}`}
                            title={isSelf ? "Use account flow to reset your own password" : undefined}
                          >
                            Reset password
                          </button>
                        </div>
                      </td>
                    </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
              <div className={styles.paginationBar}>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={loading || userPageInfo.first}
                  onClick={() => setUserPage((page) => Math.max(0, page - 1))}
                >
                  Prev
                </button>
                <span className={styles.pageInfo}>
                  Page {userPageInfo.pageNumber + 1} of {Math.max(userPageInfo.totalPages, 1)} · {userPageInfo.totalElements} rows
                </span>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={loading || userPageInfo.last}
                  onClick={() => setUserPage((page) => page + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}

          {!loading && !error && activeTab === "workspaces" && (
            <section className={styles.tablePanel}>
              <div className={styles.filterBar}>
                <input
                  className={styles.filterInput}
                  type="text"
                  placeholder="Search workspaces by name or description..."
                  value={workspaceSearchDraft}
                  onChange={(e) => setWorkspaceSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyWorkspaceFilters();
                    }
                  }}
                />
                <select
                  className={styles.filterSelect}
                  value={workspaceActiveFilter}
                  onChange={(e) => setWorkspaceActiveFilter(e.target.value as "all" | "active" | "locked")}
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="locked">Locked</option>
                </select>
                <button type="button" className={styles.filterButton} onClick={applyWorkspaceFilters}>
                  Apply
                </button>
                <button type="button" className={styles.filterButtonSecondary} onClick={resetWorkspaceFilters}>
                  Reset
                </button>
              </div>
              <div className={styles.panelHeader}>
                <h2>Workspaces</h2>
                <span>{workspacePageInfo.totalElements} total</span>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
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
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => openWorkspaceDetail(item.id)}
                          >
                            Details
                          </button>
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
              <div className={styles.paginationBar}>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={loading || workspacePageInfo.first}
                  onClick={() => setWorkspacePage((page) => Math.max(0, page - 1))}
                >
                  Prev
                </button>
                <span className={styles.pageInfo}>
                  Page {workspacePageInfo.pageNumber + 1} of {Math.max(workspacePageInfo.totalPages, 1)} · {workspacePageInfo.totalElements} rows
                </span>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={loading || workspacePageInfo.last}
                  onClick={() => setWorkspacePage((page) => page + 1)}
                >
                  Next
                </button>
              </div>
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

          {detailTarget && (
            <div className={styles.modalOverlay} onClick={closeDetailPanel}>
              <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>
                      {detailTarget.type === "user"
                        ? selectedUserSummary?.username || "User details"
                        : selectedWorkspaceSummary?.name || "Workspace details"}
                    </h3>
                  <p className={styles.modalSubTitle}>
                    {detailTarget.type === "user"
                      ? "Manage status, verification and Sadmin access."
                      : "Manage workspace status and summary."}
                  </p>
                </div>
                  <button type="button" className={styles.modalCloseButton} onClick={closeDetailPanel}>
                    ×
                  </button>
                </div>

                <div className={styles.modalBody}>
                  {detailLoading && <div className={styles.loading}>Loading details...</div>}

                  {!detailLoading && detailTarget.type === "user" && selectedUserSummary && (
                    <>
                      <div className={styles.detailStatsGrid}>
                        <div className={styles.detailStatCard}>
                          <span>Provider</span>
                          <strong>{selectedUserSummary.provider}</strong>
                        </div>
                        <div className={styles.detailStatCard}>
                          <span>Memberships</span>
                          <strong>{selectedUserSummary.membershipCount}</strong>
                        </div>
                        <div className={styles.detailStatCard}>
                          <span>Status</span>
                          <strong>{selectedUserSummary.active ? "Active" : "Locked"}</strong>
                        </div>
                        <div className={styles.detailStatCard}>
                          <span>Email</span>
                          <strong>{selectedUserSummary.emailVerified ? "Verified" : "Not verified"}</strong>
                        </div>
                      </div>

                      <div className={styles.detailSection}>
                        <div className={styles.detailSectionHeader}>
                          <h4>Memberships</h4>
                          <span>{userMemberships.length} records</span>
                        </div>
                        <div className={styles.detailList}>
                          {userMemberships.map((membership) => (
                            <div key={membership.membershipId} className={styles.detailListItem}>
                              <div>
                                <div className={styles.rowTitle}>{membership.workspaceName}</div>
                                <div className={styles.rowSub}>{membership.role} · {membership.active ? "Active" : "Locked"}</div>
                              </div>
                            </div>
                          ))}
                          {userMemberships.length === 0 && (
                            <div className={styles.emptyState}>No memberships found.</div>
                          )}
                        </div>
                      </div>

                      <div className={styles.detailActions}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => handleToggleUserStatus(selectedUserSummary)}
                          disabled={isSelectedUserSelf || actionLoading === `user-status-${selectedUserSummary.id}`}
                          title={isSelectedUserSelf ? "You cannot lock your own account" : undefined}
                        >
                          {selectedUserSummary.active ? "Lock user" : "Unlock user"}
                        </button>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => handleToggleEmailVerified(selectedUserSummary)}
                          disabled={actionLoading === `user-verified-${selectedUserSummary.id}`}
                        >
                          {selectedUserSummary.emailVerified ? "Unverify email" : "Verify email"}
                        </button>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => handleResetPassword(selectedUserSummary)}
                          disabled={isSelectedUserSelf || actionLoading === `user-password-${selectedUserSummary.id}`}
                          title={isSelectedUserSelf ? "Use account flow to reset your own password" : undefined}
                        >
                          Reset password
                        </button>
                      </div>
                    </>
                  )}

                  {!detailLoading && detailTarget.type === "workspace" && selectedWorkspaceSummary && (
                    <>
                      <div className={styles.detailStatsGrid}>
                        <div className={styles.detailStatCard}>
                          <span>Status</span>
                          <strong>{selectedWorkspaceSummary.active ? "Active" : "Locked"}</strong>
                        </div>
                        <div className={styles.detailStatCard}>
                          <span>Workspace ID</span>
                          <strong>#{selectedWorkspaceSummary.id}</strong>
                        </div>
                        <div className={styles.detailStatCard}>
                          <span>Name</span>
                          <strong>{selectedWorkspaceSummary.name}</strong>
                        </div>
                        <div className={styles.detailStatCard}>
                          <span>Summary</span>
                          <strong>{selectedWorkspaceSummary.description || "No description"}</strong>
                        </div>
                      </div>

                      <div className={styles.detailSection}>
                        <div className={styles.detailSectionHeader}>
                          <h4>Public summary</h4>
                          <span>Non-private workspace details only</span>
                        </div>
                        <div className={styles.detailList}>
                          <div className={styles.detailListItem}>
                            <div>
                              <div className={styles.rowTitle}>{selectedWorkspaceSummary.name}</div>
                              <div className={styles.rowSub}>
                                {selectedWorkspaceSummary.description || "No description"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={styles.detailActions}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => handleToggleWorkspaceStatus(selectedWorkspaceSummary)}
                          disabled={actionLoading === `workspace-status-${selectedWorkspaceSummary.id}`}
                        >
                          {selectedWorkspaceSummary.active ? "Lock workspace" : "Unlock workspace"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
