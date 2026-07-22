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
  { key: "activity", label: "System activity", icon: "bi-clock-history" }
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

const WORKSPACE_PAGE_SIZE = 6;

const emptyPageInfo: PageInfo = {
  pageNumber: 0,
  pageSize: 10,
  totalElements: 0,
  totalPages: 1,
  first: true,
  last: true
};

const emptyWorkspacePageInfo: PageInfo = {
  ...emptyPageInfo,
  pageSize: WORKSPACE_PAGE_SIZE
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
  const [notice, setNotice] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userSearchDraft, setUserSearchDraft] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(0);
  const [userPageInfo, setUserPageInfo] = useState<PageInfo>(emptyPageInfo);
  const [workspaceSearchDraft, setWorkspaceSearchDraft] = useState("");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [workspacePage, setWorkspacePage] = useState(0);
  const [workspacePageInfo, setWorkspacePageInfo] = useState<PageInfo>(emptyWorkspacePageInfo);
  const [workspaceViewMode, setWorkspaceViewMode] = useState<"grid" | "list">("grid");
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
        adminService.getUsers({ size: 8 }),
        adminService.getWorkspaces({ size: 1000 })
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
        page: 0,
        size: 1000
      });
      const filtered = response.content;
      const totalPages = Math.max(Math.ceil(filtered.length / WORKSPACE_PAGE_SIZE), 1);
      const currentPage = Math.min(workspacePage, totalPages - 1);
      const pageStart = currentPage * WORKSPACE_PAGE_SIZE;
      setWorkspaces(filtered.slice(pageStart, pageStart + WORKSPACE_PAGE_SIZE));
      setWorkspacePageInfo({
        pageNumber: currentPage,
        pageSize: WORKSPACE_PAGE_SIZE,
        totalElements: filtered.length,
        totalPages,
        first: currentPage === 0,
        last: currentPage >= totalPages - 1
      });
      if (currentPage !== workspacePage) {
        setWorkspacePage(currentPage);
      }
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
  }, [activeTab, userSearch, userPage]);

  useEffect(() => {
    if (activeTab === "workspaces") {
      loadWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, workspaceSearch, workspacePage]);

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
  };

  const refreshOpenDetail = async () => {
    if (detailTarget?.type === "user") {
      await openUserDetail(detailTarget.id);
    }
    if (detailTarget?.type === "workspace") {
      await openWorkspaceDetail(detailTarget.id);
    }
  };

  const handleResetPassword = async (item: AdminUserSummaryResponse) => {
    const nextPassword = window.prompt(`Enter a new password for ${item.username}`, "Admin@1234");
    if (!nextPassword) {
      return;
    }
    if (nextPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setActionLoading(`user-password-${item.id}`);
    setError("");
    setNotice("");
    try {
      await adminService.resetUserPassword(item.id, nextPassword);
      await refreshVisibleSection();
      if (detailTarget) {
        await refreshOpenDetail();
      }
      setNotice(`Password updated for ${item.username}.`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to reset password.");
    } finally {
      setActionLoading(null);
    }
  };

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
  const getWorkspaceInitials = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return "WS";
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 3).toUpperCase();
  };
  const selectedWorkspaceSummary = workspaceDetail
    ? ({
        id: workspaceDetail.id,
        name: workspaceDetail.name,
        description: workspaceDetail.description,
        active: workspaceDetail.active,
        memberCount: workspaceDetail.activeMemberCount,
        workspaceAdminCount: workspaceDetail.workspaceAdminCount,
        leaderCount: workspaceDetail.leaderCount,
        regularMemberCount: workspaceDetail.regularMemberCount,
        totalTaskCount: 0,
        completedTaskCount: 0,
        progressPercent: 0,
        participantInitials: workspaceDetail.memberships
          .slice(0, 4)
          .map((membership) => getWorkspaceInitials(membership.username || membership.email))
      } as AdminWorkspaceSummaryResponse)
    : null;

  const platformCards = [
    {
      label: "Total users",
      value: dashboard?.totalUsers ?? 0,
      icon: "bi-people",
      tone: "purple"
    },
    {
      label: "Total workspaces",
      value: dashboard?.totalWorkspaces ?? 0,
      icon: "bi-building",
      tone: "blue"
    },
    {
      label: "Memberships",
      value: dashboard?.totalMemberships ?? 0,
      icon: "bi-diagram-3",
      tone: "green"
    }
  ];
  const totalWorkspaceTasks = previewWorkspaces.reduce((sum, item) => sum + item.totalTaskCount, 0);
  const completedWorkspaceTasks = previewWorkspaces.reduce((sum, item) => sum + item.completedTaskCount, 0);
  const openWorkspaceTasks = Math.max(totalWorkspaceTasks - completedWorkspaceTasks, 0);
  const completionRate = totalWorkspaceTasks > 0 ? Math.round((completedWorkspaceTasks / totalWorkspaceTasks) * 100) : 0;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const leadingCalendarDays = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const calendarDays = [
    ...Array.from({ length: leadingCalendarDays }, (_, index) => ({ key: `blank-${index}`, day: null })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 }))
  ];
  const monthLabel = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const weeklyActivity = dashboard?.weeklyActivity?.length
    ? dashboard.weeklyActivity
    : ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => ({
      day,
      users: 0,
      workspaces: 0
    }));
  const weeklyUserTotal = weeklyActivity.reduce((sum, item) => sum + item.users, 0);
  const weeklyWorkspaceTotal = weeklyActivity.reduce((sum, item) => sum + item.workspaces, 0);
  const weeklyMaxValue = Math.max(
    ...weeklyActivity.flatMap((item) => [item.users, item.workspaces]),
    1
  );
  const toWeeklyPoints = (values: number[]) => {
    const denominator = Math.max(values.length - 1, 1);
    return values.map((value, index) => [
      Number(((index / denominator) * 100).toFixed(2)),
      Number((92 - (value / weeklyMaxValue) * 64).toFixed(2))
    ]);
  };
  const weeklyUserPoints = toWeeklyPoints(weeklyActivity.map((item) => item.users));
  const weeklyWorkspacePoints = toWeeklyPoints(weeklyActivity.map((item) => item.workspaces));
  const pointList = (points: number[][]) => points.map(([x, y]) => `${x},${y}`).join(" ");
  const formatDayLabel = (day: string) => day ? `${day.slice(0, 1)}${day.slice(1).toLowerCase()}` : "";
  const getEventTimestamp = (createdAt?: string) => {
    if (!createdAt) {
      return 0;
    }
    const time = new Date(createdAt).getTime();
    return Number.isNaN(time) ? 0 : time;
  };
  const formatEventTime = (createdAt?: string) => {
    if (!createdAt) {
      return "Time not recorded";
    }
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return "Time not recorded";
    }
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const topbarSearchValue =
    activeTab === "users" ? userSearchDraft : activeTab === "workspaces" ? workspaceSearchDraft : "";
  const topbarSearchPlaceholder =
    activeTab === "users"
      ? "Search users by name or email..."
      : activeTab === "workspaces"
        ? "Search workspaces by name or description..."
        : "Search is available in Users and Workspaces";
  const handleTopbarSearchChange = (nextSearch: string) => {
    if (activeTab === "users") {
      setUserSearchDraft(nextSearch);
      setUserSearch(nextSearch.trim());
      setUserPage(0);
    }
    if (activeTab === "workspaces") {
      setWorkspaceSearchDraft(nextSearch);
      setWorkspaceSearch(nextSearch.trim());
      setWorkspacePage(0);
    }
  };
  const systemEvents = [
    ...previewUsers.map((item) => ({
      key: `user-${item.id}`,
      title: "User registered",
      detail: `${item.username} - ${item.email}`,
      createdAt: item.createdAt,
      sortKey: getEventTimestamp(item.createdAt) || item.id
    })),
    ...previewWorkspaces.map((item) => ({
      key: `workspace-${item.id}`,
      title: "Workspace created",
      detail: `${item.name}${item.description ? ` - ${item.description}` : ""}`,
      createdAt: item.createdAt,
      sortKey: getEventTimestamp(item.createdAt) || item.id
    }))
  ].sort((left, right) => right.sortKey - left.sortKey).slice(0, 8);
  const dashboardEvents = systemEvents.slice(0, 5);
  const currentDay = currentDate.getDate();

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
            <input
              type="text"
              value={topbarSearchValue}
              placeholder={topbarSearchPlaceholder}
              onChange={(event) => handleTopbarSearchChange(event.target.value)}
              disabled={activeTab !== "users" && activeTab !== "workspaces"}
            />
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
              <p className={styles.subtitle}>Platform-wide account and workspace management.</p>
            </div>
          </div>

          {notice && <div className={styles.notice}>{notice}</div>}
          {loading && <div className={styles.loading}>Loading dashboard...</div>}
          {error && <div className={styles.error}>{error}</div>}

          {!loading && !error && activeTab === "dashboard" && (
            <>
              <div className={styles.platformStatGrid}>
                {platformCards.map((card) => (
                  <article key={card.label} className={styles.platformStatCard}>
                    <div className={`${styles.platformStatIcon} ${styles[card.tone]}`}>
                      <i className={`bi ${card.icon}`} />
                    </div>
                    <div>
                      <div className={styles.platformStatValue}>{card.value.toLocaleString()}</div>
                      <div className={styles.platformStatLabel}>{card.label}</div>
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.dashboardChartGrid}>
                <article className={styles.chartCard}>
                  <div className={styles.panelHeader}>
                    <h2>Task status</h2>
                    <span>{totalWorkspaceTasks.toLocaleString()} tasks</span>
                  </div>
                  <div className={styles.taskStatusLayout}>
                    <div
                      className={styles.taskDonut}
                      style={{
                        background: `conic-gradient(#10b981 0 ${completionRate}%, #4f46e5 ${completionRate}% 100%)`
                      }}
                    >
                      <span>{completionRate}%</span>
                    </div>
                    <div className={styles.taskLegendGrid}>
                      <div>
                        <span><i className={styles.legendGreen} />Completed</span>
                        <strong>{completedWorkspaceTasks.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span><i className={styles.legendIndigo} />Open</span>
                        <strong>{openWorkspaceTasks.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                </article>

                <article className={`${styles.chartCard} ${styles.weeklyCard}`}>
                  <div className={styles.panelHeader}>
                    <h2>Weekly activity</h2>
                    <div className={styles.inlineLegend}>
                      <span><i className={styles.legendIndigo} />Users {weeklyUserTotal}</span>
                      <span><i className={styles.legendGreen} />Workspaces {weeklyWorkspaceTotal}</span>
                    </div>
                  </div>
                  <div className={styles.weeklyChart}>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <polyline className={styles.chartGridLine} points="0,25 100,25" />
                      <polyline className={styles.chartGridLine} points="0,50 100,50" />
                      <polyline className={styles.chartGridLine} points="0,75 100,75" />
                      <polyline className={styles.weeklyArea} points={`0,100 ${pointList(weeklyUserPoints)} 100,100`} />
                      <polyline className={styles.weeklyLinePrimary} points={pointList(weeklyUserPoints)} />
                      <polyline className={styles.weeklyLineSecondary} points={pointList(weeklyWorkspacePoints)} />
                    </svg>
                    <div className={styles.weekLabels}>
                      {weeklyActivity.map((item) => (
                        <span key={item.day}>{formatDayLabel(item.day)}</span>
                      ))}
                    </div>
                  </div>
                </article>
              </div>

              <div className={styles.dashboardBottomGrid}>
                <section
                  className={`${styles.panel} ${styles.clickablePanel}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTab("activity")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveTab("activity");
                    }
                  }}
                >
                  <div className={styles.panelHeader}>
                    <h2>Activity timeline</h2>
                    <span>{dashboardEvents.length} items</span>
                  </div>
                  <div className={styles.cleanTimeline}>
                    {dashboardEvents.map((event, index) => (
                      <div key={event.key} className={styles.cleanTimelineItem}>
                        <span className={`${styles.timelineDot} ${index % 3 === 0 ? styles.timelineDotGreen : ""}`} />
                        <div>
                          <strong>{event.title}</strong>
                          <p>{event.detail}</p>
                          <time className={styles.eventTime}>{formatEventTime(event.createdAt)}</time>
                      </div>
                      </div>
                    ))}
                    {dashboardEvents.length === 0 && (
                      <div className={styles.emptyState}>No activity yet.</div>
                    )}
                  </div>
                </section>

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h2>Calendar</h2>
                    <span><i className="bi bi-calendar4" /> {monthLabel}</span>
                  </div>
                  <div className={styles.calendarGrid}>
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                      <span key={`${day}-${index}`} className={styles.calendarWeekday}>{day}</span>
                    ))}
                    {calendarDays.map((item) => (
                      <div
                        key={item.key}
                        className={`${styles.calendarDay} ${item.day === currentDay ? styles.calendarDayActive : ""}`}
                      >
                        {item.day && (
                          <>
                            <span>{item.day}</span>
                            {item.day <= currentDay && <i />}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {!loading && !error && activeTab === "users" && (
            <section className={`${styles.tablePanel} ${styles.usersPanel}`}>
              <div className={styles.usersPanelHeader}>
                <div>
                  <h2>Users</h2>
                  <p>Manage platform accounts, access state, and workspace participation.</p>
                </div>
                <div className={styles.usersPanelCount}>
                  <strong>{userPageInfo.totalElements}</strong>
                  <span>Total users</span>
                </div>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Provider</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.userIdentityCell}>
                          <div className={styles.userTableAvatar}>{(item.username || item.email || "US").slice(0, 2).toUpperCase()}</div>
                          <div>
                            <strong>{item.username || "Unnamed user"}</strong>
                            <span>{item.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.providerText}>{item.provider || "LOCAL"}</span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button type="button" className={styles.actionButton} onClick={() => openUserDetail(item.id)}>
                            <i className="bi bi-eye" />
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3}>
                        <div className={styles.emptyState}>No users found.</div>
                      </td>
                    </tr>
                  )}
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
                  Page {userPageInfo.pageNumber + 1} of {Math.max(userPageInfo.totalPages, 1)} - {userPageInfo.totalElements} rows
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
              <div className={styles.panelHeader}>
                <h2>Workspaces</h2>
                <span>{workspacePageInfo.totalElements} total</span>
              </div>
              <div className={styles.workspaceToolbar}>
                <div className={styles.workspaceViewToggle} aria-label="Workspace view mode">
                  <button
                    type="button"
                    className={`${styles.workspaceViewButton} ${workspaceViewMode === "grid" ? styles.workspaceViewButtonActive : ""}`}
                    aria-label="Grid view"
                    onClick={() => setWorkspaceViewMode("grid")}
                  >
                    <i className="bi bi-grid" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.workspaceViewButton} ${workspaceViewMode === "list" ? styles.workspaceViewButtonActive : ""}`}
                    aria-label="List view"
                    onClick={() => setWorkspaceViewMode("list")}
                  >
                    <i className="bi bi-list" />
                  </button>
                </div>
              </div>

              <div className={`${styles.workspaceCardGrid} ${workspaceViewMode === "list" ? styles.workspaceCardGridList : ""}`}>
                {workspaces.map((item) => {
                  return (
                    <article key={item.id} className={styles.workspaceCardItem}>
                      <div className={styles.workspaceCardHeader}>
                        <div className={styles.workspaceCardAvatar}>{getWorkspaceInitials(item.name)}</div>
                        <div className={styles.workspaceCardTitleWrap}>
                          <button type="button" className={styles.workspaceCardTitle} onClick={() => openWorkspaceDetail(item.id)}>
                            {item.name}
                          </button>
                          <div className={styles.workspaceCardTags}>
                            <span>#Workspace</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.workspaceProgressHeader}>
                        <span>Progress</span>
                        <strong>{item.progressPercent}%</strong>
                      </div>
                      <div className={styles.workspaceProgressTrack}>
                        <div className={styles.workspaceProgressFill} style={{ width: `${item.progressPercent}%` }} />
                      </div>

                      <div className={styles.workspaceCardMeta}>
                        <div className={styles.workspaceParticipants}>
                          {item.participantInitials.slice(0, 4).map((initials, index) => (
                            <span key={`${item.id}-${initials}-${index}`}>{initials}</span>
                          ))}
                          {item.memberCount > item.participantInitials.length && (
                            <span>+{item.memberCount - item.participantInitials.length}</span>
                          )}
                        </div>
                        <span className={item.active ? styles.workspaceStatusGood : styles.workspaceStatusWarn}>
                          {item.active ? "Active" : "Locked"}
                        </span>
                      </div>

                      <div className={styles.workspaceCardStats}>
                        <div>
                          <strong>{item.workspaceAdminCount}</strong>
                          <span>ADMINS</span>
                        </div>
                        <div>
                          <strong>{item.leaderCount}</strong>
                          <span>LEADERS</span>
                        </div>
                        <div>
                          <strong>{item.regularMemberCount}</strong>
                          <span>MEMBERS</span>
                        </div>
                      </div>

                      <button type="button" className={styles.workspaceCardDetails} onClick={() => openWorkspaceDetail(item.id)}>
                        Details
                      </button>
                    </article>
                  );
                })}
                {workspaces.length === 0 && (
                  <div className={styles.emptyState}>No workspaces found.</div>
                )}
              </div>
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
                  Page {workspacePageInfo.pageNumber + 1} of {Math.max(workspacePageInfo.totalPages, 1)} - {workspacePageInfo.totalElements} rows
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

          {!loading && !error && activeTab === "activity" && (
            <section className={styles.timelinePanel}>
              <div className={styles.panelHeader}>
                <h2>System activity</h2>
                <span>{systemEvents.length} items</span>
              </div>
              <div className={styles.timeline}>
                {systemEvents.map((event) => (
                  <div key={event.key} className={styles.timelineItem}>
                    <span className={styles.timelineDot} />
                    <div>
                      <div className={styles.rowTitle}>{event.title}</div>
                      <div className={styles.rowSub}>{event.detail}</div>
                      <time className={styles.eventTime}>{formatEventTime(event.createdAt)}</time>
                    </div>
                  </div>
                ))}
                {systemEvents.length === 0 && (
                  <div className={styles.emptyState}>No system activity is available yet.</div>
                )}
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
                        ? "Account and workspace memberships."
                        : "Workspace summary and participants."}
                    </p>
                  </div>
                  <button type="button" className={styles.modalCloseButton} onClick={closeDetailPanel}>
                    x
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
                          <span>Status</span>
                          <strong>{selectedUserSummary.active ? "Active" : "Locked"}</strong>
                        </div>
                        <div className={styles.detailStatCard}>
                          <span>Email</span>
                          <strong>{selectedUserSummary.email}</strong>
                        </div>
                        <div className={styles.detailStatCard}>
                          <span>Workspaces</span>
                          <strong>{selectedUserSummary.membershipCount}</strong>
                        </div>
                      </div>

                      <div className={styles.detailSection}>
                        <div className={styles.detailSectionHeader}>
                          <h4>Joined workspaces</h4>
                          <span>{userMemberships.length} records</span>
                        </div>
                        <div className={styles.detailList}>
                          {userMemberships.map((membership) => (
                            <div key={membership.membershipId} className={styles.detailListItem}>
                              <div>
                                <div className={styles.rowTitle}>{membership.workspaceName}</div>
                                <div className={styles.rowSub}>{membership.role} - {membership.active ? "Active" : "Locked"}</div>
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
                          onClick={() => handleResetPassword(selectedUserSummary)}
                          disabled={actionLoading === `user-password-${selectedUserSummary.id}`}
                        >
                          Reset password
                        </button>
                      </div>
                    </>
                  )}

                  {!detailLoading && detailTarget.type === "workspace" && selectedWorkspaceSummary && workspaceDetail && (
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
                          <span>Users</span>
                          <strong>{workspaceDetail.memberCount}</strong>
                        </div>
                        <div className={styles.detailStatCard}>
                          <span>Active users</span>
                          <strong>{workspaceDetail.activeMemberCount}</strong>
                        </div>
                      </div>

                      <div className={styles.detailSection}>
                        <div className={styles.detailSectionHeader}>
                          <h4>Workspace summary</h4>
                          <span>{selectedWorkspaceSummary.active ? "Active" : "Locked"}</span>
                        </div>
                        <div className={styles.detailListItem}>
                          <div>
                            <div className={styles.rowTitle}>{selectedWorkspaceSummary.name}</div>
                            <div className={styles.rowSub}>{selectedWorkspaceSummary.description || "No description"}</div>
                          </div>
                        </div>
                      </div>

                      <div className={styles.detailSection}>
                        <div className={styles.detailSectionHeader}>
                          <h4>Participants</h4>
                          <span>{workspaceDetail.memberships.length} records</span>
                        </div>
                        <div className={styles.detailList}>
                          {workspaceDetail.memberships.map((membership) => (
                            <div key={membership.membershipId} className={styles.detailListItem}>
                              <div>
                                <div className={styles.rowTitle}>{membership.username}</div>
                                <div className={styles.rowSub}>
                                  {membership.email} - {membership.role} - {membership.active ? "Active" : "Locked"}
                                </div>
                              </div>
                            </div>
                          ))}
                          {workspaceDetail.memberships.length === 0 && (
                            <div className={styles.emptyState}>No participants found.</div>
                          )}
                        </div>
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
