import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { memberService, type MemberDashboardResponse, type MemberNotificationResponse, type MemberTaskResponse } from "../../services/memberService";
import { workspaceService, type UserWorkspaceResponse } from "../../services/workspaceService";
import { commentService, type TaskComment } from "../../services/commentService";
import styles from "./MemberDashboard.module.css";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "bi-grid" },
  { key: "tasks", label: "My projects", icon: "bi-check2-square" },
  { key: "board", label: "Kanban board", icon: "bi-kanban" },
  { key: "history", label: "Workspace history", icon: "bi-clock-history" },
  { key: "notifications", label: "Notification", icon: "bi-bell" },
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
  const [projectTaskSearch, setProjectTaskSearch] = useState("");
  const [projectTaskProjectFilter, setProjectTaskProjectFilter] = useState("all");
  const [projectTaskStatusFilter, setProjectTaskStatusFilter] = useState<"all" | MemberTaskResponse["status"]>("all");
  const [projectTaskPriorityFilter, setProjectTaskPriorityFilter] = useState<"all" | MemberTaskResponse["priority"]>("all");
  const [boardTaskSearch, setBoardTaskSearch] = useState("");
  const [boardTaskProjectFilter, setBoardTaskProjectFilter] = useState("all");
  const [boardTaskStatusFilter, setBoardTaskStatusFilter] = useState<"all" | MemberTaskResponse["status"]>("all");
  const [boardTaskPriorityFilter, setBoardTaskPriorityFilter] = useState<"all" | MemberTaskResponse["priority"]>("all");
  const [selectedTaskProject, setSelectedTaskProject] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<MemberTaskResponse | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [notifications, setNotifications] = useState<MemberNotificationResponse[]>([]);
  const [notificationActionId, setNotificationActionId] = useState<number | null>(null);
  const [markAllNotificationsLoading, setMarkAllNotificationsLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardResult, workspacesResult, notificationsResult] = await Promise.allSettled([
        memberService.getDashboard(),
        workspaceService.getUserWorkspaces(),
        memberService.getNotifications()
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

      if (notificationsResult.status === "fulfilled") {
        setNotifications(notificationsResult.value);
      } else {
        setNotifications([]);
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

  const projectOptions = useMemo(() => {
    const names = new Set<string>();
    (dashboard?.tasks ?? []).forEach((task) => {
      const projectName = task.projectName?.trim() || "General";
      names.add(projectName);
    });
    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }, [dashboard]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const filterTasks = (
    search: string,
    projectFilter: string,
    statusFilter: "all" | MemberTaskResponse["status"],
    priorityFilter: "all" | MemberTaskResponse["priority"]
  ) => {
    const tasks = dashboard?.tasks ?? [];
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const projectName = task.projectName?.trim() || "General";
      const matchesSearch =
        !query ||
        [task.title, task.description, task.projectName, task.deadline]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesProject = projectFilter === "all" || projectName === projectFilter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesProject && matchesStatus && matchesPriority;
    });
  };

  const projectFilteredTasks = useMemo(
    () => filterTasks(projectTaskSearch, projectTaskProjectFilter, projectTaskStatusFilter, projectTaskPriorityFilter),
    [dashboard, projectTaskSearch, projectTaskProjectFilter, projectTaskStatusFilter, projectTaskPriorityFilter]
  );

  const boardFilteredTasks = useMemo(
    () => filterTasks(boardTaskSearch, boardTaskProjectFilter, boardTaskStatusFilter, boardTaskPriorityFilter),
    [dashboard, boardTaskSearch, boardTaskProjectFilter, boardTaskStatusFilter, boardTaskPriorityFilter]
  );

  const sortTasksForProjectList = (tasks: MemberTaskResponse[]) => {
    const getTaskDateValue = (task: MemberTaskResponse) => {
      if (!task.deadline) {
        return 0;
      }
      const time = new Date(task.deadline).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    return [...tasks].sort((left, right) => {
      const leftDone = left.status === "DONE";
      const rightDone = right.status === "DONE";

      if (leftDone !== rightDone) {
        return leftDone ? 1 : -1;
      }

      const leftDate = getTaskDateValue(left);
      const rightDate = getTaskDateValue(right);

      if (leftDone && rightDone) {
        return leftDate - rightDate || left.id - right.id;
      }

      return rightDate - leftDate || right.id - left.id;
    });
  };

  const groupedTasks = useMemo(() => {
    const tasks = boardFilteredTasks;
    return {
      TODO: tasks.filter((task) => task.status === "TODO"),
      IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS"),
      REVIEW: tasks.filter((task) => task.status === "REVIEW"),
      DONE: tasks.filter((task) => task.status === "DONE"),
    };
  }, [boardFilteredTasks]);

  const projectSummaries = useMemo(() => {
    const projects = new Map<string, { name: string; total: number; completed: number; tasks: MemberTaskResponse[] }>();
    projectFilteredTasks.forEach((task) => {
      const projectName = task.projectName?.trim() || "General";
      const summary = projects.get(projectName) ?? {
        name: projectName,
        total: 0,
        completed: 0,
        tasks: []
      };
      summary.total += 1;
      summary.completed += task.status === "DONE" ? 1 : 0;
      summary.tasks.push(task);
      projects.set(projectName, summary);
    });
    return Array.from(projects.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [projectFilteredTasks]);

  const selectedProjectTasks = useMemo(() => {
    if (!selectedTaskProject) {
      return [];
    }
    return sortTasksForProjectList(
      projectFilteredTasks.filter((task) => (task.projectName?.trim() || "General") === selectedTaskProject)
    );
  }, [projectFilteredTasks, selectedTaskProject]);

  const getProjectInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

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

  const formatNotificationTime = (timestamp?: string) => {
    if (!timestamp) {
      return "Just now";
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }

    return date.toLocaleString();
  };

  const updateNotificationReadState = async (notification: MemberNotificationResponse, read: boolean) => {
    if (notificationActionId === notification.id || notification.read === read) {
      return notification;
    }

    setNotificationActionId(notification.id);
    setError("");
    try {
      const updated = await memberService.updateNotificationReadState(notification.id, read);
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      return updated;
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to update notification.");
      return notification;
    } finally {
      setNotificationActionId(null);
    }
  };

  const toggleNotificationReadState = async (notification: MemberNotificationResponse) => {
    await updateNotificationReadState(notification, !notification.read);
  };

  const markAllNotificationsRead = async () => {
    if (unreadNotificationCount === 0 || markAllNotificationsLoading) {
      return;
    }

    setMarkAllNotificationsLoading(true);
    setError("");
    try {
      const updated = await memberService.markAllNotificationsRead();
      setNotifications(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to mark all notifications as read.");
    } finally {
      setMarkAllNotificationsLoading(false);
    }
  };

  const statCards = [
    { label: "Assigned", value: dashboard?.totalAssignedTasks ?? 0, tone: "blue" },
    { label: "Completed", value: dashboard?.completedTasks ?? 0, tone: "green" },
    { label: "In progress", value: dashboard?.inProgressTasks ?? 0, tone: "amber" },
    { label: "Review", value: dashboard?.reviewTasks ?? 0, tone: "purple" },
    { label: "Due soon", value: dashboard?.dueSoonTasks ?? 0, tone: "purple" },
  ];

  const totalTaskCount = dashboard?.totalAssignedTasks ?? 0;
  const todoTaskCount = Math.max(
    totalTaskCount - (dashboard?.completedTasks ?? 0) - (dashboard?.inProgressTasks ?? 0) - (dashboard?.reviewTasks ?? 0),
    0
  );
  const taskChartItems = [
    { label: "To do", value: todoTaskCount, color: "#4f46e5" },
    { label: "In progress", value: dashboard?.inProgressTasks ?? 0, color: "#f59e0b" },
    { label: "Review", value: dashboard?.reviewTasks ?? 0, color: "#8b5cf6" },
    { label: "Done", value: dashboard?.completedTasks ?? 0, color: "#22c55e" },
  ];
  const taskChartBackground = totalTaskCount > 0
    ? `conic-gradient(${taskChartItems
      .reduce<{ parts: string[]; cursor: number }>((acc, item) => {
        const size = (item.value / totalTaskCount) * 100;
        const start = acc.cursor;
        const end = acc.cursor + size;
        if (size > 0) {
          acc.parts.push(`${item.color} ${start}% ${end}%`);
        }
        acc.cursor = end;
        return acc;
      }, { parts: [], cursor: 0 })
      .parts.join(", ")})`
    : "#e2e8f0";
  const taskCompletionPercent = totalTaskCount > 0
    ? Math.round(((dashboard?.completedTasks ?? 0) / totalTaskCount) * 100)
    : 0;
  const weeklyActivity = dashboard?.weeklyActivity?.length
    ? dashboard.weeklyActivity
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, assigned: 0, completed: 0 }));
  const weeklyMaxValue = Math.max(1, ...weeklyActivity.flatMap((item) => [item.assigned, item.completed]));
  const buildWeeklyLinePoints = (key: "assigned" | "completed") =>
    weeklyActivity
      .map((item, index) => {
        const x = weeklyActivity.length <= 1 ? 50 : (index / (weeklyActivity.length - 1)) * 100;
        const y = 100 - (item[key] / weeklyMaxValue) * 82 - 8;
        return `${x},${y}`;
      })
      .join(" ");

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
              <span className={styles.navItemLabel}>{item.label}</span>
              {item.key === "notifications" && unreadNotificationCount > 0 && (
                <span className={styles.navUnreadBadge} title={`${unreadNotificationCount} unread notifications`}>
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              )}
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

          {!loading && !error && dashboard && activeTab === "tasks" && (
            <div className={styles.filterBar}>
              <input
                className={styles.filterInput}
                type="text"
                placeholder="Search task, project, deadline..."
                value={projectTaskSearch}
                onChange={(e) => setProjectTaskSearch(e.target.value)}
              />
              <select
                className={styles.filterSelect}
                value={projectTaskProjectFilter}
                onChange={(e) => setProjectTaskProjectFilter(e.target.value)}
              >
                <option value="all">All projects</option>
                {projectOptions.map((projectName) => (
                  <option key={projectName} value={projectName}>
                    {projectName}
                  </option>
                ))}
              </select>
              <select
                className={styles.filterSelect}
                value={projectTaskStatusFilter}
                onChange={(e) => setProjectTaskStatusFilter(e.target.value as "all" | MemberTaskResponse["status"])}
              >
                <option value="all">All statuses</option>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
              <select
                className={styles.filterSelect}
                value={projectTaskPriorityFilter}
                onChange={(e) => setProjectTaskPriorityFilter(e.target.value as "all" | MemberTaskResponse["priority"])}
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
                  setProjectTaskSearch("");
                  setProjectTaskProjectFilter("all");
                  setProjectTaskStatusFilter("all");
                  setProjectTaskPriorityFilter("all");
                  setSelectedTaskProject(null);
                }}
              >
                Reset
              </button>
            </div>
          )}

          {!loading && !error && dashboard && activeTab === "board" && (
            <div className={styles.filterBar}>
              <input
                className={styles.filterInput}
                type="text"
                placeholder="Search task, project, deadline..."
                value={boardTaskSearch}
                onChange={(e) => setBoardTaskSearch(e.target.value)}
              />
              <select
                className={styles.filterSelect}
                value={boardTaskProjectFilter}
                onChange={(e) => setBoardTaskProjectFilter(e.target.value)}
              >
                <option value="all">All projects</option>
                {projectOptions.map((projectName) => (
                  <option key={projectName} value={projectName}>
                    {projectName}
                  </option>
                ))}
              </select>
              <select
                className={styles.filterSelect}
                value={boardTaskStatusFilter}
                onChange={(e) => setBoardTaskStatusFilter(e.target.value as "all" | MemberTaskResponse["status"])}
              >
                <option value="all">All statuses</option>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
              <select
                className={styles.filterSelect}
                value={boardTaskPriorityFilter}
                onChange={(e) => setBoardTaskPriorityFilter(e.target.value as "all" | MemberTaskResponse["priority"])}
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
                  setBoardTaskSearch("");
                  setBoardTaskProjectFilter("all");
                  setBoardTaskStatusFilter("all");
                  setBoardTaskPriorityFilter("all");
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
              </div>

              <div className={styles.statsGrid}>
                {statCards.map((card) => (
                  <article key={card.label} className={`${styles.statCard} ${styles[card.tone]}`}>
                    <div className={styles.statLabel}>{card.label}</div>
                    <div className={styles.statValue}>{card.value.toLocaleString()}</div>
                  </article>
                ))}
              </div>

              <div className={styles.dashboardChartGrid}>
                <section className={`${styles.panel} ${styles.chartPanel}`}>
                  <div className={styles.panelHeader}>
                    <h2>Task overview</h2>
                    <span>{taskCompletionPercent}% done</span>
                  </div>
                  <div className={styles.taskChartLayout}>
                    <div className={styles.taskDonut} style={{ background: taskChartBackground }}>
                      <div className={styles.taskDonutCenter}>
                        <strong>{totalTaskCount}</strong>
                        <span>Total tasks</span>
                      </div>
                    </div>
                    <div className={styles.taskBreakdownList}>
                      {taskChartItems.map((item) => {
                        const percent = totalTaskCount > 0 ? Math.round((item.value / totalTaskCount) * 100) : 0;
                        return (
                          <div key={item.label} className={styles.taskBreakdownRow}>
                            <div className={styles.taskBreakdownTop}>
                              <span>
                                <i style={{ background: item.color }} />
                                {item.label}
                              </span>
                              <strong>{item.value}</strong>
                            </div>
                            <div className={styles.taskBreakdownTrack}>
                              <div className={styles.taskBreakdownFill} style={{ width: `${percent}%`, background: item.color }} />
                            </div>
                          </div>
                        );
                      })}
                      <div className={styles.taskBreakdownMeta}>
                        <span>{dashboard.dueSoonTasks} due soon</span>
                        <span>{dashboard.overdueTasks} overdue</span>
                      </div>
                    </div>
                  </div>
                </section>
                <section className={`${styles.panel} ${styles.weeklyPanel}`}>
                  <div className={styles.panelHeader}>
                    <h2>Weekly activity</h2>
                    <div className={styles.weeklyLegend}>
                      <span><i className={styles.weeklyAssignedDot} /> Assigned</span>
                      <span><i className={styles.weeklyCompletedDot} /> Completed</span>
                    </div>
                  </div>
                  <div className={styles.weeklyChart}>
                    <svg className={styles.weeklyChartSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <line x1="0" y1="92" x2="100" y2="92" className={styles.weeklyGridLine} />
                      <line x1="0" y1="64" x2="100" y2="64" className={styles.weeklyGridLine} />
                      <line x1="0" y1="36" x2="100" y2="36" className={styles.weeklyGridLine} />
                      <polyline className={styles.weeklyAssignedArea} points={`0,92 ${buildWeeklyLinePoints("assigned")} 100,92`} />
                      <polyline className={styles.weeklyAssignedLine} points={buildWeeklyLinePoints("assigned")} />
                      <polyline className={styles.weeklyCompletedLine} points={buildWeeklyLinePoints("completed")} />
                    </svg>
                    <div className={styles.weeklyPointLayer}>
                      {weeklyActivity.map((item, index) => {
                        const left = weeklyActivity.length <= 1 ? 50 : (index / (weeklyActivity.length - 1)) * 100;
                        const assignedTop = 100 - (item.assigned / weeklyMaxValue) * 82 - 8;
                        const completedTop = 100 - (item.completed / weeklyMaxValue) * 82 - 8;
                        return (
                          <React.Fragment key={item.day}>
                            <span
                              className={`${styles.weeklyPoint} ${styles.weeklyAssignedPoint}`}
                              style={{ left: `${left}%`, top: `${assignedTop}%` }}
                              title={`${item.day}: ${item.assigned} assigned`}
                            />
                            <span
                              className={`${styles.weeklyPoint} ${styles.weeklyCompletedPoint}`}
                              style={{ left: `${left}%`, top: `${completedTop}%` }}
                              title={`${item.day}: ${item.completed} completed`}
                            />
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <div className={styles.weeklyAxisLabels}>
                      {weeklyActivity.map((item) => (
                        <span key={item.day}>{item.day}</span>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}

          {!loading && dashboard && activeTab === "tasks" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>{selectedTaskProject ? selectedTaskProject : "My projects"}</h2>
                  {selectedTaskProject && (
                    <span className={styles.panelSubText}>{selectedProjectTasks.length} tasks in this project</span>
                  )}
                </div>
                <div className={styles.panelHeaderActions}>
                  {selectedTaskProject && (
                    <button
                      type="button"
                      className={styles.filterButtonSecondary}
                      onClick={() => setSelectedTaskProject(null)}
                    >
                      Back to projects
                    </button>
                  )}
                  <span>{selectedTaskProject ? selectedProjectTasks.length : projectSummaries.length} total</span>
                </div>
              </div>
              {selectedTaskProject ? (
                <div className={styles.taskList}>
                  {selectedProjectTasks.map((task) => renderTaskCard(task))}
                  {selectedProjectTasks.length === 0 && (
                    <div className={styles.detailListItem}>No tasks found for this project.</div>
                  )}
                </div>
              ) : (
                <div className={styles.projectGrid}>
                  {projectSummaries.map((project) => {
                    const progress = project.total === 0 ? 0 : Math.round((project.completed / project.total) * 100);
                    return (
                      <button
                        key={project.name}
                        type="button"
                        className={styles.projectCard}
                        onClick={() => setSelectedTaskProject(project.name)}
                      >
                        <div className={styles.projectCardTop}>
                          <div className={styles.projectAvatar}>{getProjectInitials(project.name)}</div>
                          <div className={styles.projectInfo}>
                            <div className={styles.projectName}>{project.name}</div>
                            <div className={styles.projectMeta}>{project.total} tasks</div>
                          </div>
                        </div>
                        <div className={styles.projectDescription}>Tasks assigned to you in this project</div>
                        <div className={styles.projectProgressTrack}>
                          <div className={styles.projectProgressFill} style={{ width: `${progress}%` }} />
                        </div>
                        <div className={styles.projectProgressLabel}>{progress}% completed</div>
                      </button>
                    );
                  })}
                  {projectSummaries.length === 0 && (
                    <div className={styles.detailListItem}>No projects found.</div>
                  )}
                </div>
              )}
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

          {!loading && dashboard && activeTab === "notifications" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Notification</h2>
                  <span className={styles.panelSubText}>Task notifications assigned to you</span>
                </div>
                <div className={styles.panelHeaderActions}>
                  <span>{unreadNotificationCount} unread</span>
                  <button
                    type="button"
                    className={styles.filterButtonSecondary}
                    onClick={() => void markAllNotificationsRead()}
                    disabled={unreadNotificationCount === 0 || markAllNotificationsLoading}
                  >
                    {markAllNotificationsLoading ? "Updating..." : "Read all"}
                  </button>
                </div>
              </div>

              <div className={styles.notificationList}>
                {notifications.map((notification) => (
                  <article
                    key={notification.id}
                    className={`${styles.notificationCard} ${!notification.read ? styles.notificationCardUnread : ""}`}
                  >
                    <div className={styles.notificationMainRow}>
                      <div className={styles.notificationFacts}>
                        <div>
                          <span>Project</span>
                          <strong>{notification.projectName || "General"}</strong>
                        </div>
                        <div>
                          <span>Assigned</span>
                          <strong>{formatNotificationTime(notification.timestamp)}</strong>
                        </div>
                        <div>
                          <span>Deadline</span>
                          <strong>{notification.deadline || "No deadline"}</strong>
                        </div>
                      </div>
                    </div>
                    <div className={styles.notificationControl}>
                      <div className={styles.notificationStatusWrap}>
                        <span className={`${styles.notificationReadDot} ${notification.read ? styles.notificationReadDotMuted : ""}`} />
                        <span className={styles.notificationState}>
                          {notification.read ? "Read" : "New"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`${styles.taskActionButton} ${notification.read ? styles.secondaryTaskActionButton : ""}`}
                        onClick={() => void toggleNotificationReadState(notification)}
                        disabled={notificationActionId === notification.id}
                      >
                        <i className={`bi ${notification.read ? "bi-envelope" : "bi-envelope-open"}`} />
                        {notification.read ? "Mark unread" : "Mark read"}
                      </button>
                    </div>
                  </article>
                ))}
                {notifications.length === 0 && (
                  <div className={styles.emptyNotifications}>
                    <i className="bi bi-bell" />
                    <p>No task notifications yet.</p>
                  </div>
                )}
              </div>
            </section>
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
