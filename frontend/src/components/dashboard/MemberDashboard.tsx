import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { memberService, type MemberDashboardResponse, type MemberTaskResponse } from "../../services/memberService";
import styles from "./MemberDashboard.module.css";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "bi-grid" },
  { key: "tasks", label: "My tasks", icon: "bi-check2-square" },
  { key: "board", label: "Kanban board", icon: "bi-kanban" },
  { key: "profile", label: "Profile", icon: "bi-person" },
] as const;

type TabKey = typeof menuItems[number]["key"];

const MemberDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [dashboard, setDashboard] = useState<MemberDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await memberService.getDashboard();
        setDashboard(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Unable to load member dashboard.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const groupedTasks = useMemo(() => {
    const tasks = dashboard?.tasks ?? [];
    return {
      TODO: tasks.filter((task) => task.status === "TODO"),
      IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS"),
      DONE: tasks.filter((task) => task.status === "DONE"),
    };
  }, [dashboard]);
  const currentSectionLabel = menuItems.find((item) => item.key === activeTab)?.label ?? "Dashboard";

  const statCards = [
    { label: "Assigned", value: dashboard?.totalAssignedTasks ?? 0, tone: "blue" },
    { label: "Completed", value: dashboard?.completedTasks ?? 0, tone: "green" },
    { label: "In progress", value: dashboard?.inProgressTasks ?? 0, tone: "amber" },
    { label: "Due soon", value: dashboard?.dueSoonTasks ?? 0, tone: "purple" },
  ];

  const renderTaskCard = (task: MemberTaskResponse) => (
    <article key={task.id} className={styles.taskCard}>
      <div className={styles.taskTopRow}>
        <span className={styles.taskProject}>{task.projectName || "General"}</span>
        <span className={`${styles.statusBadge} ${styles[`status_${task.status}`]}`}>{task.status.replace("_", " ")}</span>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description || "No description"}</p>
      <div className={styles.taskMetaRow}>
        <span className={`${styles.priorityBadge} ${styles[`priority_${task.priority}`]}`}>{task.priority}</span>
        <span className={styles.deadline}>{task.deadline || "No deadline"}</span>
      </div>
    </article>
  );

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>F</div>
          <div>
            <div className={styles.brandTitle}>Flowspace</div>
            <div className={styles.brandSub}>MEMBER</div>
          </div>
        </div>

        <div className={styles.workspaceCard}>
          <div className={styles.workspaceTitle}>{dashboard?.workspaceName || "No workspace"}</div>
          <div className={styles.workspaceMeta}>{dashboard?.role || "Member"} workspace</div>
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
            <span>Search tasks, projects, comments...</span>
          </div>
          <div className={styles.userChip}>
            <div className={styles.userAvatar}>{(user?.username || "ME").slice(0, 2).toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{user?.username || "Member"}</div>
              <div className={styles.userRole}>Member</div>
            </div>
          </div>
        </header>

        <section className={styles.content}>
          <div className={styles.headerRow}>
            <div>
              <div className={styles.breadcrumb}>Home / {currentSectionLabel}</div>
              <h1 className={styles.title}>{dashboard?.workspaceName ? `Good morning, ${dashboard.username}` : "Member dashboard"}</h1>
              <p className={styles.subtitle}>Your personal workspace view for tasks and updates.</p>
            </div>
            <div className={styles.headerActions}>
              <span className={styles.pill}>Member</span>
              <button className={styles.primaryButton} type="button">
                <i className="bi bi-plus" />
                <span>New task</span>
              </button>
            </div>
          </div>

          {loading && <div className={styles.loading}>Loading member dashboard...</div>}
          {error && <div className={styles.error}>{error}</div>}

          {!loading && !error && dashboard && activeTab === "dashboard" && (
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
                    <h2>Assigned to me</h2>
                    <span>{dashboard.tasks.length} tasks</span>
                  </div>
                  <div className={styles.taskList}>
                    {dashboard.tasks.slice(0, 5).map(renderTaskCard)}
                  </div>
                </section>

                <section className={styles.focusPanel}>
                  <div className={styles.focusHeader}>
                    <h2>Today's focus</h2>
                    <span>{dashboard.completedTasks} done</span>
                  </div>
                  <div className={styles.focusItems}>
                    {dashboard.tasks.slice(0, 4).map((task) => (
                      <div key={task.id} className={styles.focusItem}>
                        <span className={styles.focusDot} />
                        <div>
                          <div className={styles.rowTitle}>{task.title}</div>
                          <div className={styles.rowSub}>{task.projectName || "General"} · {task.deadline || "No deadline"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className={styles.bottomGrid}>
                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h2>Recent activities</h2>
                    <span>{dashboard.activities.length} items</span>
                  </div>
                  <div className={styles.activityList}>
                    {dashboard.activities.map((activity, index) => (
                      <div key={`${activity.title}-${index}`} className={styles.activityItem}>
                        <span className={`${styles.activityDot} ${styles[`tone_${activity.tone}`]}`} />
                        <div>
                          <div className={styles.rowTitle}>{activity.title}</div>
                          <div className={styles.rowSub}>{activity.detail}</div>
                          <div className={styles.activityTime}>{activity.timeLabel}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h2>Profile</h2>
                    <span>Member</span>
                  </div>
                  <div className={styles.profileCard}>
                    <div className={styles.profileAvatar}>{(dashboard.username || "ME").slice(0, 2).toUpperCase()}</div>
                    <div className={styles.profileName}>{dashboard.username}</div>
                    <div className={styles.profileMeta}>{dashboard.email}</div>
                    <div className={styles.profileMeta}>{dashboard.workspaceName || "No workspace"}</div>
                  </div>
                </section>
              </div>
            </>
          )}

          {!loading && !error && dashboard && activeTab === "tasks" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>My tasks</h2>
                <span>{dashboard.tasks.length} total</span>
              </div>
              <div className={styles.taskList}>
                {dashboard.tasks.map(renderTaskCard)}
              </div>
            </section>
          )}

          {!loading && !error && dashboard && activeTab === "board" && (
            <div className={styles.boardGrid}>
              <section className={styles.boardColumn}>
                <div className={styles.panelHeader}>
                  <h2>To do</h2>
                  <span>{groupedTasks.TODO.length}</span>
                </div>
                <div className={styles.boardList}>
                  {groupedTasks.TODO.map(renderTaskCard)}
                </div>
              </section>
              <section className={styles.boardColumn}>
                <div className={styles.panelHeader}>
                  <h2>In progress</h2>
                  <span>{groupedTasks.IN_PROGRESS.length}</span>
                </div>
                <div className={styles.boardList}>
                  {groupedTasks.IN_PROGRESS.map(renderTaskCard)}
                </div>
              </section>
              <section className={styles.boardColumn}>
                <div className={styles.panelHeader}>
                  <h2>Done</h2>
                  <span>{groupedTasks.DONE.length}</span>
                </div>
                <div className={styles.boardList}>
                  {groupedTasks.DONE.map(renderTaskCard)}
                </div>
              </section>
            </div>
          )}

          {!loading && !error && dashboard && activeTab === "profile" && (
            <section className={styles.profilePanel}>
              <div className={styles.profileHero}>
                <div className={styles.profileAvatarLarge}>{(dashboard.username || "ME").slice(0, 2).toUpperCase()}</div>
                <div>
                  <h2>{dashboard.username}</h2>
                  <p>{dashboard.email}</p>
                  <p>{dashboard.workspaceName || "No workspace"}</p>
                </div>
              </div>
              <div className={styles.profileStats}>
                <div className={styles.profileStat}>
                  <span>Assigned</span>
                  <strong>{dashboard.totalAssignedTasks}</strong>
                </div>
                <div className={styles.profileStat}>
                  <span>Completed</span>
                  <strong>{dashboard.completedTasks}</strong>
                </div>
                <div className={styles.profileStat}>
                  <span>Due soon</span>
                  <strong>{dashboard.dueSoonTasks}</strong>
                </div>
              </div>
            </section>
          )}
        </section>
      </main>
    </div>
  );
};

export default MemberDashboard;
