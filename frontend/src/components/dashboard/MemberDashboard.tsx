import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { memberService, type MemberDashboardResponse, type MemberTaskResponse } from "../../services/memberService";
import { workspaceService, type UserWorkspaceResponse } from "../../services/workspaceService";
import { commentService, type TaskComment } from "../../services/commentService";
import styles from "./MemberDashboard.module.css";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "bi-grid" },
  { key: "tasks", label: "My tasks", icon: "bi-check2-square" },
  { key: "board", label: "Kanban board", icon: "bi-kanban" },
  { key: "history", label: "Workspace history", icon: "bi-clock-history" },
  { key: "profile", label: "Profile", icon: "bi-person" }
] as const;

type TabKey = typeof menuItems[number]["key"];

const MemberDashboard: React.FC = () => {
  const { user, logout, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [dashboard, setDashboard] = useState<MemberDashboardResponse | null>(null);
  const [userWorkspaces, setUserWorkspaces] = useState<UserWorkspaceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdateTaskId, setStatusUpdateTaskId] = useState<number | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<MemberTaskResponse["status"] | null>(null);
  const [workspaceSwitchingId, setWorkspaceSwitchingId] = useState<number | null>(null);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [createWorkspaceLoading, setCreateWorkspaceLoading] = useState(false);
  const [createWorkspaceError, setCreateWorkspaceError] = useState("");
  const [createWorkspaceSuccess, setCreateWorkspaceSuccess] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | MemberTaskResponse["status"]>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | MemberTaskResponse["priority"]>("all");
  const [selectedTask, setSelectedTask] = useState<MemberTaskResponse | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardResult, workspacesResult] = await Promise.allSettled([
        memberService.getDashboard(),
        workspaceService.getUserWorkspaces()
      ]);

      if (dashboardResult.status === "fulfilled") {
        setDashboard(dashboardResult.value);
      } else {
        throw dashboardResult.reason;
      }

      if (workspacesResult.status === "fulfilled") {
        setUserWorkspaces(workspacesResult.value);
      } else {
        setUserWorkspaces([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load member dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      commentService.getCommentsByTask(selectedTask.id)
        .then(data => setTaskComments(data))
        .catch(err => console.error("Failed to load comments", err));
    } else {
      setTaskComments([]);
      setNewComment("");
    }
  }, [selectedTask]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    try {
      const added = await commentService.addCommentToTask(selectedTask.id, newComment);
      setTaskComments(prev => [...prev, added]);
      setNewComment("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add comment");
    }
  };

  const activeWorkspace = useMemo(() => {
    if (!dashboard) {
      return null;
    }

    return (
      userWorkspaces.find((item) => item.workspaceId === dashboard.workspaceId) ?? {
        workspaceId: dashboard.workspaceId,
        workspaceName: dashboard.workspaceName || "Current workspace",
        roleName: dashboard.role
      }
    );
  }, [dashboard, userWorkspaces]);

  const filteredTasks = useMemo(() => {
    const tasks = dashboard?.tasks ?? [];
    const query = taskSearch.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        [task.title, task.description, task.projectName, task.deadline]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = taskStatusFilter === "all" || task.status === taskStatusFilter;
      const matchesPriority = taskPriorityFilter === "all" || task.priority === taskPriorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [dashboard, taskSearch, taskStatusFilter, taskPriorityFilter]);

  const groupedTasks = useMemo(() => {
    const tasks = filteredTasks;
    return {
      TODO: tasks.filter((task) => task.status === "TODO"),
      IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS"),
      REVIEW: tasks.filter((task) => task.status === "REVIEW"),
      DONE: tasks.filter((task) => task.status === "DONE"),
    };
  }, [filteredTasks]);
  const currentSectionLabel = menuItems.find((item) => item.key === activeTab)?.label ?? "Dashboard";
  const taskStatusColumns: Array<{ status: MemberTaskResponse["status"]; label: string; tasks: MemberTaskResponse[] }> = [
    { status: "TODO", label: "To do", tasks: groupedTasks.TODO },
    { status: "IN_PROGRESS", label: "In progress", tasks: groupedTasks.IN_PROGRESS },
    { status: "REVIEW", label: "Review", tasks: groupedTasks.REVIEW },
    { status: "DONE", label: "Done", tasks: groupedTasks.DONE }
  ];

  const updateTaskStatus = async (task: MemberTaskResponse, nextStatus: MemberTaskResponse["status"]) => {
    if (task.status === nextStatus || statusUpdateTaskId === task.id) {
      return;
    }

    setStatusUpdateTaskId(task.id);
    setError("");
    try {
      await memberService.updateTaskStatus(task.id, nextStatus);
      setSelectedTask((current) => (current?.id === task.id ? { ...current, status: nextStatus } : current));
      await loadDashboard();
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to update task status.");
    } finally {
      setStatusUpdateTaskId(null);
    }
  };

  const handleTaskDragStart = (event: React.DragEvent<HTMLElement>, task: MemberTaskResponse) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(task.id));
    setDraggingTaskId(task.id);
  };

  const showTemporaryError = (msg: string) => {
    setError(msg);
    setTimeout(() => {
      setError((prev) => (prev === msg ? "" : prev));
    }, 3000);
  };

  const handleTaskDrop = (event: React.DragEvent<HTMLElement>, nextStatus: MemberTaskResponse["status"]) => {
    event.preventDefault();
    const draggedTaskId = Number(event.dataTransfer.getData("text/plain") || draggingTaskId);
    const task = dashboard?.tasks.find((item) => item.id === draggedTaskId);

    setDraggingTaskId(null);
    setDropTargetStatus(null);

    if (task) {
      if (nextStatus === "DONE") {
        showTemporaryError("Chỉ Leader mới có quyền duyệt task sang DONE.");
        return;
      }
      if (task.status === "DONE") {
        showTemporaryError("Không thể thao tác với task đã hoàn thành.");
        return;
      }
      void updateTaskStatus(task, nextStatus);
    }
  };

  const handleColumnDragLeave = (event: React.DragEvent<HTMLElement>, status: MemberTaskResponse["status"]) => {
    const nextElement = event.relatedTarget;
    if (nextElement instanceof Node && event.currentTarget.contains(nextElement)) {
      return;
    }

    setDropTargetStatus((current) => (current === status ? null : current));
  };

  const handleSwitchWorkspace = async (workspaceId: number) => {
    if (workspaceSwitchingId === workspaceId || dashboard?.workspaceId === workspaceId) {
      return;
    }

    setWorkspaceSwitchingId(workspaceId);
    setWorkspaceDropdownOpen(false);
    setError("");
    try {
      await workspaceService.switchWorkspace(workspaceId);
      await checkAuth();
      await loadDashboard();
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to switch workspace.");
    } finally {
      setWorkspaceSwitchingId(null);
    }
  };

  const openCreateWorkspaceModal = () => {
    setWorkspaceDropdownOpen(false);
    setCreateWorkspaceError("");
    setCreateWorkspaceSuccess("");
    setShowCreateWorkspaceModal(true);
  };

  const closeCreateWorkspaceModal = () => {
    setShowCreateWorkspaceModal(false);
    setCreateWorkspaceError("");
    setCreateWorkspaceSuccess("");
  };

  const handleCreateWorkspaceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newWorkspaceName.trim()) {
      setCreateWorkspaceError("Workspace name is required.");
      return;
    }

    setCreateWorkspaceLoading(true);
    setCreateWorkspaceError("");
    setCreateWorkspaceSuccess("");
    try {
      await workspaceService.createWorkspace(newWorkspaceName.trim(), newWorkspaceDescription.trim());
      setCreateWorkspaceSuccess("Workspace created successfully. Reloading...");
      setNewWorkspaceName("");
      setNewWorkspaceDescription("");
      await checkAuth();
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      setCreateWorkspaceError(err.response?.data?.message || "Unable to create workspace.");
      setCreateWorkspaceLoading(false);
    }
  };

  const formatWorkspaceRole = (roleName: string) => {
    if (roleName === "WORKSPACE_ADMIN") {
      return "Workspace admin";
    }
    if (roleName === "LEADER") {
      return "Leader";
    }
    return "Member";
  };

  const statCards = [
    { label: "Assigned", value: dashboard?.totalAssignedTasks ?? 0, tone: "blue" },
    { label: "Completed", value: dashboard?.completedTasks ?? 0, tone: "green" },
    { label: "In progress", value: dashboard?.inProgressTasks ?? 0, tone: "amber" },
    { label: "Review", value: dashboard?.reviewTasks ?? 0, tone: "purple" },
    { label: "Due soon", value: dashboard?.dueSoonTasks ?? 0, tone: "purple" },
  ];

  const renderTaskCard = (task: MemberTaskResponse, options?: { draggable?: boolean }) => {
    const isDone = task.status === "DONE";
    const canDrag = options?.draggable && !isDone;

    return (
      <article
        key={task.id}
        className={`${styles.taskCard} ${canDrag ? styles.draggableTaskCard : ""} ${draggingTaskId === task.id ? styles.draggingTaskCard : ""
          } ${statusUpdateTaskId === task.id ? styles.updatingTaskCard : ""}`}
        style={isDone ? { opacity: 0.6, pointerEvents: "none" } : undefined}
        role="button"
        tabIndex={0}
        draggable={canDrag}
        onDragStart={canDrag ? (event) => handleTaskDragStart(event, task) : undefined}
        onDragEnd={canDrag ? () => {
          setDraggingTaskId(null);
          setDropTargetStatus(null);
        } : undefined}
      onClick={() => setSelectedTask(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelectedTask(task);
        }
      }}
    >
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
      <div className={styles.taskActions}>
        <button
          type="button"
          className={`${styles.taskActionButton} ${styles.secondaryTaskActionButton}`}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedTask(task);
          }}
          disabled={isDone}
        >
          {statusUpdateTaskId === task.id ? "Updating..." : "Details"}
        </button>
      </div>
    </article>
  );
  };

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

        <div className={styles.workspaceSelectorContainer}>
          <button
            type="button"
            className={styles.workspaceSelectorBtn}
            onClick={() => setWorkspaceDropdownOpen((open) => !open)}
          >
            <div className={styles.workspaceAvatar}>
              {(activeWorkspace?.workspaceName || "WS").slice(0, 2).toUpperCase()}
            </div>
            <div className={styles.workspaceMetaWrap}>
              <span className={styles.workspaceActiveName}>{activeWorkspace?.workspaceName || "No workspace"}</span>
              <span className={styles.workspaceActiveRole}>
                {(activeWorkspace as any)?.uncompletedTaskCount || 0} Uncompleted
              </span>
            </div>
            <i className={`bi bi-chevron-down ${styles.chevronIcon} ${workspaceDropdownOpen ? styles.chevronOpen : ""}`} />
          </button>

          {workspaceDropdownOpen && (
            <div className={styles.workspaceDropdown}>
              <p className={styles.dropdownSectionTitle}>Your workspaces</p>
              {userWorkspaces.length === 0 && (
                <div className={styles.workspaceEmpty}>No joined workspaces yet.</div>
              )}
              {userWorkspaces.filter(ws => ws.uncompletedTaskCount > 0 || ws.workspaceId === dashboard?.workspaceId).map((workspace) => {
                const isActive = workspace.workspaceId === dashboard?.workspaceId;
                return (
                  <button
                    key={workspace.workspaceId}
                    type="button"
                    className={`${styles.workspaceDropdownItem} ${isActive ? styles.workspaceDropdownItemActive : ""}`}
                    onClick={() => handleSwitchWorkspace(workspace.workspaceId)}
                    disabled={workspaceSwitchingId === workspace.workspaceId || isActive}
                  >
                    <div className={styles.workspaceDropdownMain}>
                      <span className={styles.workspaceDropdownName}>{workspace.workspaceName}</span>
                      <span className={styles.workspaceDropdownRole}>
                        <i className="bi bi-list-task" style={{ marginRight: "3px" }} />
                        {workspace.uncompletedTaskCount} tasks chưa xong
                      </span>
                    </div>
                    <span className={styles.workspaceDropdownAction}>
                      {workspaceSwitchingId === workspace.workspaceId ? "Switching..." : isActive ? "Active" : "Switch"}
                    </span>
                  </button>
                );
              })}

              <button type="button" className={styles.dropdownActionBtn} onClick={openCreateWorkspaceModal}>
                <i className="bi bi-plus-lg" />
                <span>Create workspace</span>
              </button>
            </div>
          )}
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
            </div>
          </div>

          {!loading && !error && dashboard && (
            <div className={styles.filterBar}>
              <input
                className={styles.filterInput}
                type="text"
                placeholder="Search task, project, deadline..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
              />
              <select
                className={styles.filterSelect}
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value as "all" | MemberTaskResponse["status"])}
              >
                <option value="all">All statuses</option>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
              <select
                className={styles.filterSelect}
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value as "all" | MemberTaskResponse["priority"])}
              >
                <option value="all">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <button
                type="button"
                className={styles.filterButtonSecondary}
                onClick={() => {
                  setTaskSearch("");
                  setTaskStatusFilter("all");
                  setTaskPriorityFilter("all");
                }}
              >
                Reset
              </button>
            </div>
          )}

          {loading && <div className={styles.loading}>Loading member dashboard...</div>}
          {error && <div className={styles.error}>{error}</div>}

          {!loading && dashboard && activeTab === "dashboard" && (
            <>
              <div className={styles.workspaceSummaryGrid}>
                <article className={styles.workspaceSummaryCard}>
                  <div className={styles.summaryLabel}>Current workspace</div>
                  <div className={styles.summaryValue}>{activeWorkspace?.workspaceName || dashboard.workspaceName || "No workspace"}</div>
                  <div className={styles.summaryMeta}>Workspace ID: {dashboard.workspaceId ?? "N/A"}</div>
                </article>
                <article className={styles.workspaceSummaryCard}>
                  <div className={styles.summaryLabel}>Your role</div>
                  <div className={styles.summaryValue}>{dashboard.role}</div>
                  <div className={styles.summaryMeta}>Joined workspaces: {userWorkspaces.length}</div>
                </article>
                <article className={styles.workspaceSummaryCard}>
                  <div className={styles.summaryLabel}>Next action</div>
                  <div className={styles.summaryValue}>{dashboard.dueSoonTasks > 0 ? "Finish due tasks" : "Keep board tidy"}</div>
                  <div className={styles.summaryMeta}>Open tasks: {dashboard.totalAssignedTasks - dashboard.completedTasks}</div>
                </article>
              </div>

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
                    <span>{filteredTasks.length} tasks</span>
                  </div>
                  <div className={styles.taskList}>
                    {filteredTasks.slice(0, 5).map((task) => renderTaskCard(task))}
                  </div>
                </section>

                <section className={styles.focusPanel}>
                  <div className={styles.focusHeader}>
                    <h2>Today's focus</h2>
                    <span>{groupedTasks.DONE.length} done</span>
                  </div>
                  <div className={styles.focusItems}>
                    {filteredTasks.slice(0, 4).map((task) => (
                      <div key={task.id} className={styles.focusItem}>
                        <span className={styles.focusDot} />
                        <div>
                          <div className={styles.rowTitle}>{task.title}</div>
                          <div className={styles.rowSub}>{task.projectName || "General"} - {task.deadline || "No deadline"}</div>
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
              </div>
            </>
          )}

          {!loading && dashboard && activeTab === "tasks" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>My tasks</h2>
                <span>{filteredTasks.length} total</span>
              </div>
              <div className={styles.taskList}>
                {filteredTasks.map((task) => renderTaskCard(task))}
              </div>
            </section>
          )}

          {!loading && dashboard && activeTab === "board" && (
            <div className={styles.boardGrid}>
              {taskStatusColumns.map((column) => (
                <section
                  key={column.status}
                  className={`${styles.boardColumn} ${dropTargetStatus === column.status ? styles.boardColumnDropTarget : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropTargetStatus(column.status);
                  }}
                  onDragLeave={(event) => handleColumnDragLeave(event, column.status)}
                  onDrop={(event) => handleTaskDrop(event, column.status)}
                >
                  <div className={styles.panelHeader}>
                    <h2>{column.label}</h2>
                    <span>{column.tasks.length}</span>
                  </div>
                  <div className={styles.boardList}>
                    {column.tasks.map((task) => renderTaskCard(task, { draggable: true }))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {!loading && dashboard && activeTab === "profile" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>My profile</h2>
                <span>{dashboard.role}</span>
              </div>
              <div className={styles.profileCard}>
                <div className={styles.profileAvatar}>{(user?.username || "ME").slice(0, 2).toUpperCase()}</div>
                <div className={styles.profileMeta}>
                  <div className={styles.profileName}>{user?.username || dashboard.username}</div>
                  <div className={styles.profileEmail}>{user?.email || "No email"}</div>
                  <div className={styles.profileRow}>Current workspace: {activeWorkspace?.workspaceName || dashboard.workspaceName || "No workspace"}</div>
                  <div className={styles.profileRow}>Joined workspaces: {userWorkspaces.length}</div>
                  <div className={styles.profileRow}>Account status: Active</div>
                </div>
              </div>
            </section>
          )}

          {!loading && dashboard && activeTab === "history" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Workspace History</h2>
                <span>Lịch sử các Workspace và các task hoàn thành</span>
              </div>
              <div className={styles["history-list"]}>
                {userWorkspaces.length === 0 ? (
                  <div className={styles["empty-state-history"]}>
                    <i className="bi bi-clock-history"></i>
                    <p>Bạn chưa tham gia Workspace nào.</p>
                  </div>
                ) : (
                  userWorkspaces.map((ws) => {
                    const isActive = ws.workspaceId === dashboard?.workspaceId;
                    return (
                      <div
                        key={ws.workspaceId}
                        className={`${styles["history-card"]} ${!isActive ? styles["history-card-clickable"] : ""}`}
                        onClick={() => {
                          if (!isActive) {
                            handleSwitchWorkspace(ws.workspaceId);
                          }
                        }}
                      >
                        <div className={styles["history-card-header"]}>
                          <div className={styles["history-card-info"]}>
                            <div className={styles["history-avatar"]}>
                              {ws.workspaceName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className={styles["history-ws-name"]}>
                                {ws.workspaceName}
                                {isActive ? (
                                  <span className={styles["active-badge"]}>Active</span>
                                ) : (
                                  <span className={styles["switch-hint-badge"]}>Click to switch</span>
                                )}
                              </h3>
                              <p className={styles["history-ws-meta"]}>
                                Vai trò: <strong>{formatWorkspaceRole(ws.roleName)}</strong>
                              </p>
                            </div>
                          </div>

                          <div className={styles["history-ws-stats"]}>
                            <span className={styles["stat-count-badge"]}>
                              <i className="bi bi-clock"></i> Chưa xong: {ws.uncompletedTaskCount}
                            </span>
                            <span className={`${styles["stat-count-badge"]} ${styles["success"]}`}>
                              <i className="bi bi-check-circle"></i> Đã xong: {ws.completedTaskCount}
                            </span>
                          </div>
                        </div>

                        {/* Completed tasks inside this workspace */}
                        <div className={styles["history-tasks-section"]}>
                          <h4 className={styles["history-tasks-title"]}>
                            <i className="bi bi-check2-all"></i> Các task đã hoàn thành của bạn ({ws.completedTasks?.length || 0})
                          </h4>

                          {!ws.completedTasks || ws.completedTasks.length === 0 ? (
                            <p className={styles["no-tasks-text"]}>Không có task nào đã hoàn thành trong Workspace này.</p>
                          ) : (
                            <div className={styles["history-tasks-grid"]}>
                              {ws.completedTasks.map((t) => (
                                <div key={t.id} className={styles["history-task-item"]}>
                                  <div className={styles["history-task-top"]}>
                                    <span className={styles["history-task-proj"]}>{t.projectName}</span>
                                    <span className={`${styles["history-task-priority"]} ${styles[t.priority] || ""}`}>
                                      {t.priority}
                                    </span>
                                  </div>
                                  <h5 className={styles["history-task-title"]}>{t.title}</h5>
                                  {t.deadline && (
                                    <div className={styles["history-task-deadline"]}>
                                      <i className="bi bi-calendar-event"></i> Hạn chót: {t.deadline}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }))}
              </div>
            </section>
          )}

          {selectedTask && dashboard && (
            <div className={styles.modalOverlay} onClick={() => setSelectedTask(null)}>
              <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>{selectedTask.title}</h3>
                    <p className={styles.modalSubTitle}>
                      {selectedTask.projectName || "General"} - {selectedTask.deadline || "No deadline"}
                    </p>
                  </div>
                  <button type="button" className={styles.modalCloseButton} onClick={() => setSelectedTask(null)}>
                    ×
                  </button>
                </div>

                <div className={styles.modalBody}>
                  <div className={styles.detailStatsGrid}>
                    <div className={styles.detailStatCard}>
                      <span>Status</span>
                      <strong>{selectedTask.status.replace("_", " ")}</strong>
                    </div>
                    <div className={styles.detailStatCard}>
                      <span>Priority</span>
                      <strong>{selectedTask.priority}</strong>
                    </div>
                    <div className={styles.detailStatCard}>
                      <span>Project</span>
                      <strong>{selectedTask.projectName || "General"}</strong>
                    </div>
                    <div className={styles.detailStatCard}>
                      <span>Deadline</span>
                      <strong>{selectedTask.deadline || "No deadline"}</strong>
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionHeader}>
                      <h4>Description</h4>
                      <span>Task #{selectedTask.id}</span>
                    </div>
                    <div className={styles.detailList}>
                      <div className={styles.detailListItem}>
                        {selectedTask.description || "No description provided."}
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionHeader}>
                      <h4>Comments</h4>
                    </div>
                    <div className={styles["comments-list"]}>
                      {taskComments.length === 0 ? (
                        <div style={{ fontSize: "0.9rem", color: "#94a3b8", fontStyle: "italic", marginBottom: "16px" }}>
                          No comments yet.
                        </div>
                      ) : (
                        taskComments.map(c => (
                          <div key={c.id} className={styles["comment-item"]}>
                            <div className={styles["comment-avatar"]}>
                              {c.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className={styles["comment-content-box"]}>
                              <div className={styles["comment-header"]}>
                                <strong>{c.username}</strong>
                                <span>{new Date(c.timestamp).toLocaleString()}</span>
                              </div>
                              <div className={styles["comment-text"]}>{c.content}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className={styles["comment-input-area"]}>
                      <textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        className={styles["form-input"]}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button 
                          className={styles.taskActionButton} 
                          onClick={() => void handleAddComment()}
                          disabled={!newComment.trim()}
                          style={{ backgroundColor: "#3b82f6", color: "white", border: "none" }}
                        >
                          <i className="bi bi-send" /> Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showCreateWorkspaceModal && (
            <div className={styles.modalOverlay} onClick={closeCreateWorkspaceModal}>
              <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>Create workspace</h3>
                    <p className={styles.modalSubTitle}>Start a new workspace and invite people later.</p>
                  </div>
                  <button type="button" className={styles.modalCloseButton} onClick={closeCreateWorkspaceModal}>
                    ×
                  </button>
                </div>
                <div className={styles.modalBody}>
                  {createWorkspaceError && <div className={styles.error}>{createWorkspaceError}</div>}
                  {createWorkspaceSuccess && <div className={styles.loading}>{createWorkspaceSuccess}</div>}
                  <form className={styles.createWorkspaceForm} onSubmit={handleCreateWorkspaceSubmit}>
                    <label className={styles.formLabel}>
                      Workspace name
                      <input
                        className={styles.filterInput}
                        type="text"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="e.g. Northwind Studio"
                      />
                    </label>
                    <label className={styles.formLabel}>
                      Description
                      <textarea
                        className={styles.textArea}
                        value={newWorkspaceDescription}
                        onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                        placeholder="What is this workspace for?"
                        rows={4}
                      />
                    </label>
                    <div className={styles.detailActions}>
                      <button type="button" className={styles.taskActionButton} onClick={closeCreateWorkspaceModal}>
                        Cancel
                      </button>
                      <button type="submit" className={styles.taskActionButton} disabled={createWorkspaceLoading}>
                        {createWorkspaceLoading ? "Creating..." : "Create workspace"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MemberDashboard;
