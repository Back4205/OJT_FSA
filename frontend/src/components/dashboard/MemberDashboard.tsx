import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { memberService, type MemberDashboardResponse, type MemberNotificationResponse, type MemberTaskResponse } from "../../services/memberService";
import { workspaceService, type UserWorkspaceResponse } from "../../services/workspaceService";
import { commentService, type TaskComment } from "../../services/commentService";
import NotificationDropdown from "../common/NotificationDropdown";
import styles from "./MemberDashboard.module.css";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "bi-grid" },
  { key: "tasks", label: "My projects", icon: "bi-check2-square" },
  { key: "history", label: "Workspace history", icon: "bi-clock-history" },
  { key: "profile", label: "Profile", icon: "bi-person" }
] as const;

type TabKey = typeof menuItems[number]["key"];

const MemberDashboard: React.FC = () => {
  const { user, logout, checkAuth, updateProfile } = useAuth();
  
  const { "*": splat } = useParams();
  const navigate = useNavigate();
  const pathParts = (splat || "").split("/").filter(Boolean);
  const activeTab = (pathParts[0] as TabKey) || "dashboard";
  
  const setActiveTab = (tab: TabKey) => {
    navigate(`/taskmanager/dashboard/${tab === "dashboard" ? "" : tab}`);
  };
  
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
  const [workspaceInviteCode, setWorkspaceInviteCode] = useState("");
  const [createWorkspaceLoading, setCreateWorkspaceLoading] = useState(false);
  const [createWorkspaceError, setCreateWorkspaceError] = useState("");
  const [createWorkspaceSuccess, setCreateWorkspaceSuccess] = useState("");
  const [projectListSearch, setProjectListSearch] = useState("");
  const [projectBoardSearch, setProjectBoardSearch] = useState("");
  const [selectedTaskProject, setSelectedTaskProject] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<MemberTaskResponse | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [notifications, setNotifications] = useState<MemberNotificationResponse[]>([]);

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
      setProfileError("Username cannot be empty");
      return;
    }

    if (profilePassword) {
      if (profilePassword.length < 6) {
        setProfileError("Password must be at least 6 characters long");
        return;
      }
      if (profilePassword !== profileConfirmPassword) {
        setProfileError("Confirm password does not match");
        return;
      }
    }

    setProfileLoading(true);
    try {
      await updateProfile(profileUsername.trim(), profilePassword);
      setProfileSuccess("Personal profile updated successfully.");
      setProfilePassword("");
      setProfileConfirmPassword("");
    } catch (err: any) {
      setProfileError(err.response?.data?.message || "Failed to update profile details.");
    } finally {
      setProfileLoading(false);
    }
  };

  const loadDashboard = async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true);
      setError("");
    }
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
      if (showSpinner) {
        setError(err.response?.data?.message || "Unable to load member dashboard.");
      }
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadDashboard();
    const refreshTimer = window.setInterval(() => {
      void loadDashboard(false);
    }, 30000);

    const roleRefreshTimer = window.setInterval(() => {
      void checkAuth();
    }, 10000);

    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(roleRefreshTimer);
    };
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
    if (isWorkspaceLocked || selectedTask.projectEnded) {
      showTemporaryError(isWorkspaceLocked ? "Workspace is locked. You can view tasks only." : "Project has ended. You can view tasks only.");
      return;
    }
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
        roleName: dashboard.role,
        active: dashboard.workspaceActive,
        uncompletedTaskCount: 0,
        completedTaskCount: 0,
        uncompletedTasks: []
      }
    );
  }, [dashboard, userWorkspaces]);

  const filterTasks = (search: string) => {
    const tasks = dashboard?.tasks ?? [];
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        [task.title, task.description, task.projectName, task.deadline]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesSearch;
    });
  };

  const projectFilteredTasks = useMemo(
    () => filterTasks(projectListSearch),
    [dashboard, projectListSearch]
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

  const projectSummaries = useMemo(() => {
    const projects = new Map<string, { name: string; total: number; completed: number; ended: boolean; tasks: MemberTaskResponse[] }>();
    projectFilteredTasks.forEach((task) => {
      const projectName = task.projectName?.trim() || "General";
      const summary = projects.get(projectName) ?? {
        name: projectName,
        total: 0,
        completed: 0,
        ended: false,
        tasks: []
      };
      summary.total += 1;
      summary.completed += task.status === "DONE" ? 1 : 0;
      summary.ended = summary.ended || Boolean(task.projectEnded);
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
      filterTasks(projectBoardSearch).filter((task) => (task.projectName?.trim() || "General") === selectedTaskProject)
    );
  }, [dashboard, projectBoardSearch, selectedTaskProject]);

  const selectedProjectTaskColumns = useMemo(() => ({
    TODO: selectedProjectTasks.filter((task) => task.status === "TODO"),
    IN_PROGRESS: selectedProjectTasks.filter((task) => task.status === "IN_PROGRESS"),
    REVIEW: selectedProjectTasks.filter((task) => task.status === "REVIEW"),
    DONE: selectedProjectTasks.filter((task) => task.status === "DONE"),
  }), [selectedProjectTasks]);

  const getProjectInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const currentSectionLabel = menuItems.find((item) => item.key === activeTab)?.label ?? "Dashboard";
  const isWorkspaceLocked = dashboard?.workspaceActive === false;
  const selectedProjectEnded = useMemo(() => {
    if (!selectedTaskProject) {
      return false;
    }

    return (dashboard?.tasks ?? []).some((task) =>
      (task.projectName?.trim() || "General") === selectedTaskProject && task.projectEnded
    );
  }, [dashboard, selectedTaskProject]);
  const selectedProjectReadOnly = isWorkspaceLocked || selectedProjectEnded;
  const isTaskReadOnly = (task: MemberTaskResponse) => isWorkspaceLocked || Boolean(task.projectEnded);
  const taskStatusColumns: Array<{ status: MemberTaskResponse["status"]; label: string; tasks: MemberTaskResponse[] }> = [
    { status: "TODO", label: "To do", tasks: selectedProjectTaskColumns.TODO },
    { status: "IN_PROGRESS", label: "In progress", tasks: selectedProjectTaskColumns.IN_PROGRESS },
    { status: "REVIEW", label: "Review", tasks: selectedProjectTaskColumns.REVIEW },
    { status: "DONE", label: "Done", tasks: selectedProjectTaskColumns.DONE }
  ];

  const updateTaskStatus = async (task: MemberTaskResponse, nextStatus: MemberTaskResponse["status"]) => {
    if (task.status === nextStatus || statusUpdateTaskId === task.id) {
      return;
    }
    if (isWorkspaceLocked) {
      showTemporaryError("Workspace is locked. You can view tasks only.");
      return;
    }
    if (task.projectEnded) {
      showTemporaryError("Project has ended. You can view tasks only.");
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
      if (isWorkspaceLocked) {
        showTemporaryError("Workspace is locked. You can view tasks only.");
        return;
      }
      if (task.projectEnded) {
        showTemporaryError("Project has ended. You can view tasks only.");
        return;
      }
      if (nextStatus === "DONE") {
        showTemporaryError("Only Leaders can approve tasks to DONE.");
        return;
      }
      if (task.status === "DONE") {
        showTemporaryError("Cannot modify a completed task.");
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
      window.location.replace("/taskmanager/dashboard"); // reset về dashboard, tránh stale tab URL
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

  const handleJoinWorkspaceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceInviteCode.trim()) {
      setCreateWorkspaceError("Invite code is required.");
      return;
    }

    setCreateWorkspaceLoading(true);
    setCreateWorkspaceError("");
    setCreateWorkspaceSuccess("");
    try {
      await workspaceService.joinWorkspace(workspaceInviteCode.trim());
      setCreateWorkspaceSuccess("Join request sent. Please wait for workspace admin approval.");
      setWorkspaceInviteCode("");
      setCreateWorkspaceLoading(false);
    } catch (err: any) {
      setCreateWorkspaceError(err.response?.data?.message || "Unable to join workspace.");
      setCreateWorkspaceLoading(false);
    }
  };

  const formatWorkspaceRole = (roleName: string) => {
    if (roleName === "WORKSPACE_ADMIN") {
      return "Admin · Business";
    }
    if (roleName === "LEADER") {
      return "Leader · Business";
    }
    return "Member · Business";
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
  const weeklyAssignedTotal = weeklyActivity.reduce((sum, item) => sum + item.assigned, 0);
  const weeklyCompletedTotal = weeklyActivity.reduce((sum, item) => sum + item.completed, 0);
  const weeklyMaxValue = Math.max(1, ...weeklyActivity.flatMap((item) => [item.assigned, item.completed]));
  const getWeeklyPointX = (index: number) =>
    weeklyActivity.length <= 1 ? 50 : ((index + 0.5) / weeklyActivity.length) * 100;
  const buildWeeklyLinePoints = (key: "assigned" | "completed") =>
    weeklyActivity
      .map((item, index) => {
        const x = getWeeklyPointX(index);
        const y = 100 - (item[key] / weeklyMaxValue) * 82 - 8;
        return `${x},${y}`;
      })
      .join(" ");

  const renderTaskCard = (task: MemberTaskResponse, options?: { draggable?: boolean }) => {
    const isDone = task.status === "DONE";
    const isUnassigned = !task.assigneeUsername;
    // Member can only drag/update their own assigned tasks
    const canDrag = options?.draggable && !isDone && !isTaskReadOnly(task) && !isUnassigned;

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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isUnassigned && (
            <span style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fcd34d",
              letterSpacing: "0.02em",
            }}>
              Unassigned
            </span>
          )}
          <span className={`${styles.statusBadge} ${styles[`status_${task.status}`]}`}>{task.status.replace("_", " ")}</span>
        </div>
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
                {activeWorkspace?.active === false ? "Locked · " : ""}
                {formatWorkspaceRole(activeWorkspace?.roleName || dashboard?.role || "MEMBER")}
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
              {userWorkspaces
                .filter((workspace) => workspace.uncompletedTaskCount > 0 || workspace.workspaceId === dashboard?.workspaceId)
                .map((workspace) => {
                const isActive = workspace.workspaceId === dashboard?.workspaceId;
                return (
                  <button
                    key={workspace.workspaceId}
                    type="button"
                    className={`${styles.workspaceDropdownItem} ${isActive ? styles.workspaceDropdownItemActive : ""}`}
                    onClick={() => handleSwitchWorkspace(workspace.workspaceId)}
                    disabled={workspaceSwitchingId === workspace.workspaceId}
                  >
                    <div className={styles.workspaceItemAvatar}>
                      {(workspace.workspaceName || "WS").slice(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.workspaceDropdownMain}>
                      <span className={styles.workspaceDropdownName}>{workspace.workspaceName}</span>
                      <span className={styles.workspaceDropdownRole}>
                        {workspace.uncompletedTaskCount} Uncompleted
                      </span>
                    </div>
                    {!workspace.active && (
                      <span className={styles.workspaceStatusBadge}>Locked</span>
                    )}
                    {isActive && (
                      <i className={`bi bi-check ${styles.checkIcon}`}></i>
                    )}
                  </button>
                );
              })}

              <button type="button" className={styles.dropdownActionBtn} onClick={openCreateWorkspaceModal}>
                <i className={`bi bi-plus-lg ${styles.actionIcon}`} />
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
          <div className={styles.topbarActions}>
            <NotificationDropdown
              notifications={notifications}
              onMarkRead={async (id, read) => {
                await memberService.updateNotificationReadState(id, read);
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read } : n));
              }}
              onMarkAllRead={async () => {
                await memberService.markAllNotificationsRead();
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              }}
              onNavigateToTask={(taskId) => {
                const task = dashboard?.tasks.find(t => t.id === taskId);
                if (task) {
                  setSelectedTask(task);
                  setActiveTab("tasks");
                }
              }}
              onRefresh={() => void memberService.getNotifications().then(setNotifications).catch(() => {})}
            />
            <div className={styles.userChip}>
              <div className={styles.userAvatar}>{(user?.username || "ME").slice(0, 2).toUpperCase()}</div>
              <div>
                <div className={styles.userName}>{user?.username || "Member"}</div>
                <div className={styles.userRole}>Member</div>
              </div>
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
          </div>

          {!loading && !error && dashboard && activeTab === "tasks" && (
            <div className={styles.filterBar}>
              <input
                className={styles.filterInput}
                type="text"
                placeholder={selectedTaskProject ? "Search tasks in this project..." : "Search projects, tasks, deadline..."}
                value={selectedTaskProject ? projectBoardSearch : projectListSearch}
                onChange={(e) => {
                  if (selectedTaskProject) {
                    setProjectBoardSearch(e.target.value);
                  } else {
                    setProjectListSearch(e.target.value);
                  }
                }}
              />
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
                  <div className={styles.weeklySummaryGrid}>
                    <div className={styles.weeklySummaryItem}>
                      <span>Assigned this week</span>
                      <strong>{weeklyAssignedTotal}</strong>
                    </div>
                    <div className={styles.weeklySummaryItem}>
                      <span>Completed this week</span>
                      <strong>{weeklyCompletedTotal}</strong>
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
                        const left = getWeeklyPointX(index);
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
                  <div className={styles.weeklyDayGrid}>
                    {weeklyActivity.map((item) => (
                      <div key={item.day} className={styles.weeklyDayCard}>
                        <strong>{item.day}</strong>
                        <span><i className={styles.weeklyAssignedDot} /> {item.assigned}</span>
                        <span><i className={styles.weeklyCompletedDot} /> {item.completed}</span>
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
                <>
                  {selectedProjectReadOnly && (
                    <div className={styles.lockedWorkspaceNotice}>
                      <i className="bi bi-lock" />
                      <span>{isWorkspaceLocked ? "This workspace is locked. Tasks are view only." : "This project has ended. Tasks are view only."}</span>
                    </div>
                  )}
                  <div className={`${styles.boardGrid} ${styles.projectBoardGrid}`}>
                    {taskStatusColumns.map((column) => (
                      <section
                        key={column.status}
                        className={`${styles.boardColumn} ${dropTargetStatus === column.status ? styles.boardColumnDropTarget : ""}`}
                        onDragOver={!selectedProjectReadOnly ? (event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDropTargetStatus(column.status);
                        } : undefined}
                        onDragLeave={!selectedProjectReadOnly ? (event) => handleColumnDragLeave(event, column.status) : undefined}
                        onDrop={!selectedProjectReadOnly ? (event) => handleTaskDrop(event, column.status) : undefined}
                      >
                        <div className={styles.panelHeader}>
                          <h2>{column.label}</h2>
                          <span>{column.tasks.length}</span>
                        </div>
                        <div className={styles.boardList}>
                          {column.tasks.map((task) => renderTaskCard(task, { draggable: true }))}
                          {column.tasks.length === 0 && (
                            <div className={styles.detailListItem}>No tasks.</div>
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.projectGrid}>
                  {projectSummaries.map((project) => {
                    const progress = project.total === 0 ? 0 : Math.round((project.completed / project.total) * 100);
                    return (
                      <button
                        key={project.name}
                        type="button"
                        className={styles.projectCard}
                        onClick={() => {
                          setSelectedTaskProject(project.name);
                          setProjectBoardSearch("");
                        }}
                      >
                        <div className={styles.projectCardTop}>
                          <div className={styles.projectAvatar}>{getProjectInitials(project.name)}</div>
                          <div className={styles.projectInfo}>
                            <div className={styles.projectName}>{project.name}</div>
                            <div className={styles.projectMeta}>{project.total} tasks</div>
                          </div>
                          {(isWorkspaceLocked || project.ended) && (
                            <span
                              className={styles.projectLockedBadge}
                              title={isWorkspaceLocked ? "Workspace is locked" : "Project has ended"}
                            >
                              <i className="bi bi-lock" />
                              Locked
                            </span>
                          )}
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

          {!loading && dashboard && activeTab === "profile" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>My profile</h2>
                <span>{dashboard.role}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px", alignItems: "start", marginTop: "20px" }}>
                {/* Left Card: Read-only summary */}
                <div className={styles.profileCard} style={{ margin: 0, padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div className={styles.profileAvatar} style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(99, 102, 241, 0.1)", color: "var(--admin-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.5rem", marginBottom: "16px" }}>
                    {(user?.username || "ME").slice(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.profileMeta} style={{ width: "100%", textAlign: "left" }}>
                    <div className={styles.profileName} style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "12px", color: "var(--admin-text-main)", textAlign: "center" }}>
                      {user?.username || dashboard.username}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)", marginBottom: "8px", borderBottom: "1px dashed var(--admin-border)", paddingBottom: "6px" }}>
                      <strong>Email: </strong>{user?.email || "No email"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)", marginBottom: "8px", borderBottom: "1px dashed var(--admin-border)", paddingBottom: "6px" }}>
                      <strong>Current Role (Read-only): </strong>{user?.role || dashboard.role || "MEMBER"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)", marginBottom: "8px", borderBottom: "1px dashed var(--admin-border)", paddingBottom: "6px" }}>
                      <strong>Workspace: </strong>{dashboard.workspaceName || "No workspace"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)" }}>
                      <strong>Status: </strong>Active
                    </div>
                  </div>
                </div>

                {/* Right Card: Update Profile Form */}
                <div style={{ background: "var(--admin-card-bg)", padding: "24px", borderRadius: "12px", border: "1px solid var(--admin-border)" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "1.05rem", fontWeight: 700, color: "var(--admin-text-main)", borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px" }}>
                    Update Personal Information
                  </h3>

                  {user?.provider !== "LOCAL" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px", color: "#d97706", fontSize: "0.82rem", fontWeight: 500 }}>
                      <i className="bi bi-info-circle-fill" style={{ fontSize: "0.95rem" }}></i>
                      <span>This account is authenticated via {user?.provider || "OAuth2"}. Password changes are disabled for OAuth2 accounts.</span>
                    </div>
                  )}

                  {profileSuccess && (
                    <div className={`${styles["alert-box"]} ${styles["alert-success"]}`} style={{ marginBottom: "16px", padding: "10px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#047857", borderRadius: "8px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="bi bi-check-circle-fill"></i>
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  {profileError && (
                    <div className={`${styles["alert-box"]} ${styles["alert-error"]}`} style={{ marginBottom: "16px", padding: "10px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#b91c1c", borderRadius: "8px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <span>{profileError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfileSubmit}>
                    <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label htmlFor="profile-username" style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--admin-text-main)" }}>
                        Display Name / Full Name
                      </label>
                      <input
                        type="text"
                        id="profile-username"
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--admin-border)", outline: "none", fontSize: "0.88rem" }}
                        value={profileUsername}
                        onChange={(e) => setProfileUsername(e.target.value)}
                        required
                        placeholder="Enter your name"
                      />
                    </div>

                    {user?.provider === "LOCAL" && (
                      <>
                        <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label htmlFor="profile-password" style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--admin-text-main)" }}>
                            New Password (Leave blank to keep current)
                          </label>
                          <input
                            type="password"
                            id="profile-password"
                            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--admin-border)", outline: "none", fontSize: "0.88rem" }}
                            value={profilePassword}
                            onChange={(e) => setProfilePassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                          />
                        </div>

                        <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label htmlFor="profile-confirm-password" style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--admin-text-main)" }}>
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            id="profile-confirm-password"
                            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--admin-border)", outline: "none", fontSize: "0.88rem" }}
                            value={profileConfirmPassword}
                            onChange={(e) => setProfileConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                          />
                        </div>
                      </>
                    )}

                    <button type="submit" style={{ width: "100%", height: "40px", borderRadius: "8px", border: "none", background: "var(--admin-primary)", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} disabled={profileLoading}>
                      {profileLoading ? (
                        <span>Updating Profile...</span>
                      ) : (
                        <>
                          <i className="bi bi-person-check-fill"></i>
                          <span>Save Profile Details</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </section>
          )}

          {!loading && dashboard && activeTab === "history" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Workspace History</h2>
                <span>History of Workspaces and completed tasks</span>
              </div>
              <div className={styles["history-list"]}>
                {userWorkspaces.length === 0 ? (
                  <div className={styles["empty-state-history"]}>
                    <i className="bi bi-clock-history"></i>
                    <p>You have not joined any workspaces.</p>
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
                                {isActive && (
                                  <span className={styles["active-badge"]}>Active</span>
                                )}
                              </h3>
                              <p className={styles["history-ws-meta"]}>
                                Role: <strong>{formatWorkspaceRole(ws.roleName)}</strong>
                              </p>
                            </div>
                          </div>

                          <div className={styles["history-ws-stats"]}>
                            <span className={styles["stat-count-badge"]}>
                              <i className="bi bi-clock"></i> Uncompleted: {ws.uncompletedTaskCount}
                            </span>
                            <span className={`${styles["stat-count-badge"]} ${styles["success"]}`}>
                              <i className="bi bi-check-circle"></i> Completed: {ws.completedTaskCount}
                            </span>
                          </div>
                        </div>

                          {/* Uncompleted tasks inside this workspace */}
                          <div className={styles["history-tasks-section"]}>
                            <h4 className={styles["history-tasks-title"]}>
                              <i className="bi bi-clock"></i> Uncompleted tasks ({ws.uncompletedTasks?.length || 0})
                            </h4>

                          {!ws.uncompletedTasks || ws.uncompletedTasks.length === 0 ? (
                            <p className={styles["no-tasks-text"]}>No uncompleted tasks in this Workspace.</p>
                          ) : (
                            <div className={styles["history-tasks-grid"]}>
                              {ws.uncompletedTasks.map((t) => (
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
                                      <i className="bi bi-calendar-event"></i> Deadline: {t.deadline}
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
                        disabled={isWorkspaceLocked || selectedTask.projectEnded}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button 
                          className={styles.taskActionButton} 
                          onClick={() => void handleAddComment()}
                          disabled={!newComment.trim() || isWorkspaceLocked || selectedTask.projectEnded}
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
              <div className={`${styles.modalContent} ${styles.workspaceAddModal}`} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3>Add new Workspace</h3>
                  </div>
                  <button type="button" className={styles.modalCloseButton} onClick={closeCreateWorkspaceModal}>
                    ×
                  </button>
                </div>
                <div className={styles.modalBody}>
                  {createWorkspaceError && <div className={styles.error}>{createWorkspaceError}</div>}
                  {createWorkspaceSuccess && <div className={styles.loading}>{createWorkspaceSuccess}</div>}
                  <div>
                    <h3 className={styles.workspaceModalSectionTitle}>Create new Workspace</h3>
                    <form onSubmit={handleCreateWorkspaceSubmit}>
                      <div className={styles.workspaceFormGroup}>
                        <label className={styles.workspaceFormLabel}>Workspace Name <span>*</span></label>
                        <input
                          type="text"
                          className={styles.workspaceFormInput}
                          placeholder="e.g. Team Alpha..."
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          disabled={createWorkspaceLoading}
                        />
                      </div>
                      <div className={styles.workspaceFormGroup}>
                        <label className={styles.workspaceFormLabel}>Description (Optional)</label>
                        <textarea
                          className={styles.workspaceFormTextarea}
                          placeholder="Enter a short description for this workspace..."
                          value={newWorkspaceDescription}
                          onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                          disabled={createWorkspaceLoading}
                          rows={2}
                        />
                      </div>
                      <div className={styles.workspaceModalActionRow}>
                        <button type="submit" className={styles.workspacePrimaryButton} disabled={createWorkspaceLoading}>
                          {createWorkspaceLoading ? "Processing..." : "Initialize"}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div>
                    <h3 className={styles.workspaceModalSectionTitle}>Or Join via Invite Code</h3>
                    <form onSubmit={handleJoinWorkspaceSubmit}>
                      <div className={styles.workspaceFormGroup}>
                        <label className={styles.workspaceFormLabel}>Invite Code <span>*</span></label>
                        <input
                          type="text"
                          className={styles.workspaceFormInput}
                          placeholder="e.g. WS-A2B4C6D8"
                          value={workspaceInviteCode}
                          onChange={(e) => setWorkspaceInviteCode(e.target.value.toUpperCase())}
                          disabled={createWorkspaceLoading}
                        />
                      </div>
                      <div className={styles.workspaceModalActionRow}>
                        <button type="submit" className={styles.workspacePrimaryButton} disabled={createWorkspaceLoading}>
                          {createWorkspaceLoading ? "Processing..." : "Join Now"}
                        </button>
                      </div>
                    </form>
                  </div>
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
