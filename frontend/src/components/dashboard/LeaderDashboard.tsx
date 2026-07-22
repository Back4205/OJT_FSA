import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  leaderService,
  type ProjectResponse,
  type TaskResponse,
  type TaskStatus,
  type TaskPriority,
  type WorkspaceMemberShort,
  type CreateProjectRequest,
  type CreateTaskRequest,
} from "../../services/leaderService";
import { workspaceService, type UserWorkspaceResponse } from "../../services/workspaceService";
import { commentService, type TaskComment } from "../../services/commentService";
import styles from "./LeaderDashboard.module.css";

// ── Avatar helpers ─────────────────────────────────────────────────────────
const AVATAR_COLORS = ["av-violet", "av-blue", "av-teal", "av-amber", "av-rose", "av-indigo"];

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const avatarColor = (idx: number) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

// ── Due date helpers ───────────────────────────────────────────────────────
const formatDue = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const isOverdue = (iso?: string) => {
  if (!iso) return false;
  return new Date(iso) < new Date();
};

const deadlineVariant = (iso?: string): "overdue" | "upcoming" | "normal" => {
  if (!iso) return "normal";
  const d = new Date(iso);
  const now = new Date();
  if (d < now) return "overdue";
  const threeDays = new Date(now.getTime() + 3 * 86400000);
  if (d <= threeDays) return "upcoming";
  return "normal";
};

// ── Component ──────────────────────────────────────────────────────────────
type ActiveTab = "dashboard" | "projects" | "project_detail" | "task_detail" | "members" | "profile" | "history";

const LeaderDashboard: React.FC = () => {
  const { user, logout, checkAuth } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [projectViewMode, setProjectViewMode] = useState<"list" | "board">("list");
  const [listCurrentPage, setListCurrentPage] = useState<number>(1);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"ALL" | TaskPriority>("ALL");

  // Drag and Drop state
  const [statusUpdateTaskId, setStatusUpdateTaskId] = useState<number | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null);

  // Data
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [wsMembers, setWsMembers] = useState<WorkspaceMemberShort[]>([]);
  const [allTasks, setAllTasks] = useState<TaskResponse[]>([]);
  const [userWs, setUserWs] = useState<UserWorkspaceResponse[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [wsDdOpen, setWsDdOpen] = useState(false);
  const [userDdOpen, setUserDdOpen] = useState(false);

  // Modals
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);

  // Forms
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskProject, setTaskProject] = useState<number>(0);
  const [taskAssignee, setTaskAssignee] = useState<number>(0);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [manageMembersProjectId, setManageMembersProjectId] = useState<number | null>(null);
  const [manageMembersSearch, setManageMembersSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [manageMembersActionLoading, setManageMembersActionLoading] = useState(false);

  // Create Workspace Form
  const [newWSNameInput, setNewWSNameInput] = useState("");
  const [newWSDescInput, setNewWSDescInput] = useState("");
  const [joinWSCodeInput, setJoinWSCodeInput] = useState("");
  const [wsModalLoading, setWsModalLoading] = useState(false);
  const [wsModalError, setWsModalError] = useState("");
  const [wsModalSuccess, setWsModalSuccess] = useState("");

  // Auto-clear messages
  useEffect(() => {
    if (!successMsg && !errorMsg) return;
    const t = setTimeout(() => { setSuccessMsg(""); setErrorMsg(""); }, 4000);
    return () => clearTimeout(t);
  }, [successMsg, errorMsg]);

  // ── Load initial data ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projs, mems, wsData, statsData] = await Promise.all([
        leaderService.getProjects(),
        leaderService.getWorkspaceMembers().catch(() => []), // Catch 403 for MEMBER
        leaderService.getUserWorkspaces(),
        leaderService.getDashboardStats().catch(() => null),
      ]);
      console.log("[LeaderDashboard] Projects loaded:", projs);
      console.log("[LeaderDashboard] Members loaded:", mems);
      setProjects(projs);
      setWsMembers(mems);
      setUserWs(wsData);
      setStats(statsData);

      // Fetch tasks for all projects (limited: first 3 projects)
      const taskPromises = projs.slice(0, 5).map(p =>
        leaderService.getTasksByProject(p.id, 0, 20).then(r => r.content).catch(() => [] as TaskResponse[])
      );
      const tasksNested = await Promise.all(taskPromises);
      setAllTasks(tasksNested.flat());
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTaskId) return;
    try {
      const added = await commentService.addCommentToTask(selectedTaskId, newComment);
      setTaskComments(prev => [...prev, added]);
      setNewComment("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add comment");
    }
  };

  // Load comments when task is selected
  useEffect(() => {
    if (activeTab === "task_detail" && selectedTaskId !== null) {
      commentService.getCommentsByTask(selectedTaskId)
        .then(data => setTaskComments(data))
        .catch(err => console.error("Failed to load comments", err));
    }
  }, [activeTab, selectedTaskId]);



  // ── Workspace switch ─────────────────────────────────────────────────────
  const handleSwitchWs = async (wsId: number) => {
    setWsDdOpen(false);
    setLoading(true);
    try {
      await workspaceService.switchWorkspace(wsId);
      await checkAuth();
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Chuyển workspace thất bại.");
      setLoading(false);
    }
  };

  const handleCreateNewWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWSNameInput.trim()) {
      setWsModalError("Tên Workspace không được để trống.");
      return;
    }
    setWsModalLoading(true);
    setWsModalError("");
    setWsModalSuccess("");
    try {
      await workspaceService.createWorkspace(newWSNameInput.trim(), newWSDescInput.trim());
      setWsModalSuccess("Khởi tạo Workspace mới thành công! Đang chuyển hướng...");
      setNewWSNameInput("");
      setNewWSDescInput("");
      await checkAuth();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setWsModalError(err.response?.data?.message || "Tạo Workspace thất bại.");
      setWsModalLoading(false);
    }
  };

  const handleJoinNewWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinWSCodeInput.trim()) {
      setWsModalError("Mã mời không được để trống.");
      return;
    }
    setWsModalLoading(true);
    setWsModalError("");
    setWsModalSuccess("");
    try {
      await workspaceService.joinWorkspace(joinWSCodeInput.trim());
      setWsModalSuccess("Tham gia Workspace thành công! Đang chuyển hướng...");
      setJoinWSCodeInput("");
      await checkAuth();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setWsModalError(err.response?.data?.message || "Mã mời không hợp lệ hoặc đã hết hạn.");
      setWsModalLoading(false);
    }
  };

  // ── Create project ───────────────────────────────────────────────────────
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) { setErrorMsg("Tên project không được để trống."); return; }
    try {
      const req: CreateProjectRequest = { name: projName.trim(), description: projDesc.trim() };
      await leaderService.createProject(req);
      setSuccessMsg("Tạo project thành công.");
      setShowCreateProject(false);
      setProjName(""); setProjDesc("");
      const projs = await leaderService.getProjects();
      setProjects(projs);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Tạo project thất bại.");
    }
  };

  // ── Create task ──────────────────────────────────────────────────────────
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskProject) {
      setErrorMsg("Vui lòng nhập tiêu đề task và chọn project.");
      return;
    }
    try {
      const req: CreateTaskRequest = {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        priority: taskPriority,
        deadline: taskDeadline || undefined,
        projectId: taskProject,
        assigneeId: taskAssignee || undefined,
      };
      await leaderService.createTask(req);
      setSuccessMsg("Tạo task thành công.");
      setShowCreateTask(false);
      setTaskTitle(""); setTaskDesc(""); setTaskDeadline("");
      setTaskProject(0); setTaskAssignee(0);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Tạo task thất bại.");
    }
  };

  // ── Update task status ───────────────────────────────────────────────────
  const handleUpdateTaskStatus = async (taskId: number, newStatus: TaskStatus) => {
    try {
      await leaderService.updateTaskStatus(taskId, newStatus);
      setSuccessMsg(`Đã cập nhật trạng thái task thành ${newStatus.replace("_", " ")}.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Cập nhật trạng thái task thất bại.");
    }
  };

  const handleTaskDragStart = (event: React.DragEvent<HTMLDivElement>, task: TaskResponse) => {
    setDraggingTaskId(task.id);
    event.dataTransfer.setData("application/json", JSON.stringify(task));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDragLeave = (event: React.DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    if (dropTargetStatus === status) {
      setDropTargetStatus(null);
    }
  };

  const handleTaskDrop = async (event: React.DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    setDropTargetStatus(null);
    setDraggingTaskId(null);

    const taskData = event.dataTransfer.getData("application/json");
    if (!taskData) return;

    try {
      const parsedTask = JSON.parse(taskData) as TaskResponse;
      if (parsedTask.status === status) return; // No change

      setStatusUpdateTaskId(parsedTask.id);
      await handleUpdateTaskStatus(parsedTask.id, status);
    } catch (e) {
      console.error("Drop failed", e);
    } finally {
      setStatusUpdateTaskId(null);
    }
  };

  // ── Invite member ────────────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await leaderService.inviteMember(inviteEmail.trim());
      setSuccessMsg(`Đã mời ${inviteEmail} vào workspace.`);
      setShowInvite(false);
      setInviteEmail("");
      const mems = await leaderService.getWorkspaceMembers();
      setWsMembers(mems);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Mời thành viên thất bại.");
    }
  };

  const handleOpenAddMembers = (projectId: number) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    setManageMembersProjectId(projectId);
    setSelectedMemberIds([]);
    setManageMembersSearch("");
    setShowManageMembersModal(true);
  };

  const handleToggleManageMember = (memberId: number) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSaveAddMembers = async () => {
    if (manageMembersProjectId === null) return;
    const proj = projects.find(p => p.id === manageMembersProjectId);
    if (!proj) return;

    if (selectedMemberIds.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất một thành viên để thêm.");
      return;
    }

    const currentMemberCount = proj.members ? proj.members.length : 0;
    if (proj.maxMembers !== undefined && proj.maxMembers !== null && currentMemberCount + selectedMemberIds.length > proj.maxMembers) {
      setErrorMsg(`Không thể thêm. Dự án đã đạt giới hạn tối đa là ${proj.maxMembers} thành viên.`);
      return;
    }

    if (manageMembersActionLoading) return;
    setManageMembersActionLoading(true);
    setErrorMsg("");

    try {
      const addPromises = selectedMemberIds.map(id => leaderService.addProjectMember(manageMembersProjectId, id));
      await Promise.all(addPromises);
      
      setSuccessMsg("Đã thêm thành viên vào Project thành công.");
      setShowManageMembersModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Đã xảy ra lỗi khi thêm thành viên.");
    } finally {
      setManageMembersActionLoading(false);
    }
  };

  const handleRemoveMemberFromProject = async (projectId: number, memberId: number, memberUsername: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${memberUsername} khỏi project này không?`)) return;
    setManageMembersActionLoading(true);
    setErrorMsg("");
    try {
      await leaderService.removeProjectMember(projectId, memberId);
      setSuccessMsg(`Đã xóa ${memberUsername} khỏi project.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể xóa member.");
    } finally {
      setManageMembersActionLoading(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const todoTasks = allTasks.filter(t => t.status === "TODO" || t.status === "IN_PROGRESS");
  const doneTasks = allTasks.filter(t => t.status === "DONE");
  // ── Render helpers ────────────────────────────────────────────────────────
  const currentWsName = user?.workspaceName || "Workspace";
  const currentWsObj = userWs.find(ws => ws.workspaceId === user?.workspaceId);
  const uncompletedTaskCount = currentWsObj ? currentWsObj.uncompletedTaskCount : 0;

  const renderStatusDonutChart = () => {
    const defaultData = {
      COMPLETED: stats?.tasksByStatus?.COMPLETED || 0,
      TODO: stats?.tasksByStatus?.TODO || 0,
      IN_PROGRESS: stats?.tasksByStatus?.IN_PROGRESS || 0,
      REVIEW: stats?.tasksByStatus?.REVIEW || 0,
    };

    const total = defaultData.COMPLETED + defaultData.TODO + defaultData.IN_PROGRESS + defaultData.REVIEW;

    // Nếu tổng thống kê số task bằng 0 thì gán giả định trực quan để sinh động màu
    const plotData = total > 0 ? defaultData : { COMPLETED: 6914, IN_PROGRESS: 2014, TODO: 2868, REVIEW: 270 };
    const plotTotal = plotData.COMPLETED + plotData.IN_PROGRESS + plotData.TODO + plotData.REVIEW;

    const r = 40;
    const circ = 2 * Math.PI * r;

    // Tính toán góc hoặc dash offset cho 4 loại
    const items = [
      { key: "COMPLETED", value: plotData.COMPLETED, color: "var(--admin-success)" },
      { key: "IN_PROGRESS", value: plotData.IN_PROGRESS, color: "var(--admin-info)" },
      { key: "TODO", value: plotData.TODO, color: "var(--admin-warning)" },
      { key: "REVIEW", value: plotData.REVIEW, color: "var(--admin-danger)" },
    ];

    let accumulatedLength = 0;

    return (
      <div className={styles["donut-chart-container"]}>
        <div className={styles["donut-svg-wrapper"]}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
            {items.map((item, idx) => {
              const currentPercentage = (item.value / plotTotal) * 100;
              const strokeLength = (currentPercentage / 100) * circ;
              const strokeOffset = -accumulatedLength;
              accumulatedLength += strokeLength;
              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="12"
                  strokeDasharray={`${strokeLength} ${circ}`}
                  strokeDashoffset={strokeOffset}
                  transform="rotate(-90 50 50)"
                />
              );
            })}
          </svg>
          <div className={styles["donut-center-text"]}>
            <div className={styles["donut-center-value"]}>{(stats?.totalTasks || 0).toLocaleString()}</div>
            <div className={styles["donut-center-lbl"]}>Total tasks</div>
          </div>
        </div>

        <div className={styles["donut-legend"]}>
          <div className={styles["legend-item"]}>
            <div className={styles["legend-label-group"]}>
              <span className={styles["legend-color"]} style={{ backgroundColor: "var(--admin-success)" }}></span>
              <span>Completed</span>
            </div>
            <span className={styles["legend-value"]}>{defaultData.COMPLETED.toLocaleString()}</span>
          </div>
          <div className={styles["legend-item"]}>
            <div className={styles["legend-label-group"]}>
              <span className={styles["legend-color"]} style={{ backgroundColor: "var(--admin-info)" }}></span>
              <span>In Progress</span>
            </div>
            <span className={styles["legend-value"]}>{defaultData.IN_PROGRESS.toLocaleString()}</span>
          </div>
          <div className={styles["legend-item"]}>
            <div className={styles["legend-label-group"]}>
              <span className={styles["legend-color"]} style={{ backgroundColor: "var(--admin-warning)" }}></span>
              <span>To Do</span>
            </div>
            <span className={styles["legend-value"]}>{defaultData.TODO.toLocaleString()}</span>
          </div>
          <div className={styles["legend-item"]}>
            <div className={styles["legend-label-group"]}>
              <span className={styles["legend-color"]} style={{ backgroundColor: "var(--admin-danger)" }}></span>
              <span>Review</span>
            </div>
            <span className={styles["legend-value"]}>{defaultData.REVIEW.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderWeeklyActivityChart = () => {
    const today = new Date();
    let currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const todayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    const createdData = (stats?.createdTasksWeekly || [0, 0, 0, 0, 0, 0, 0]).slice(0, todayIndex + 1);
    const completedData = (stats?.completedTasksWeekly || [0, 0, 0, 0, 0, 0, 0]).slice(0, todayIndex + 1);

    const maxVal = Math.max(...createdData, ...completedData, 5);

    const xCoords = [50, 150, 250, 350, 450, 550, 650];

    const createdPoints = createdData.map((val, i) => ({
      x: xCoords[i],
      y: 110 - (val / maxVal) * 90
    }));

    const completedPoints = completedData.map((val, i) => ({
      x: xCoords[i],
      y: 110 - (val / maxVal) * 90
    }));

    const createdPath = createdPoints.length > 0
      ? `M ${createdPoints.map(p => `${p.x},${p.y}`).join(" L ")}`
      : "";
    const createdArea = createdPoints.length > 0
      ? `${createdPath} L ${createdPoints[createdPoints.length - 1].x},120 L 50,120 Z`
      : "";

    const completedPath = completedPoints.length > 0
      ? `M ${completedPoints.map(p => `${p.x},${p.y}`).join(" L ")}`
      : "";
    const completedArea = completedPoints.length > 0
      ? `${completedPath} L ${completedPoints[completedPoints.length - 1].x},120 L 50,120 Z`
      : "";

    return (
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <div className={styles["line-chart-legend"]}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "4px", backgroundColor: "#6366f1", borderRadius: "2px" }}></span>
            <span>Created tasks</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "4px", backgroundColor: "#10b981", borderRadius: "2px" }}></span>
            <span>Completed tasks</span>
          </div>
        </div>

        <div className={styles["line-chart-wrapper"]}>
          <div className={styles["axis-y-labels"]}>
            <span>{Math.round(maxVal)}</span>
            <span>{Math.round(maxVal * 0.75)}</span>
            <span>{Math.round(maxVal * 0.5)}</span>
            <span>{Math.round(maxVal * 0.25)}</span>
            <span>0</span>
          </div>

          <div className={styles["chart-grid-lines"]}>
            <div className={styles["grid-line"]} style={{ top: "0%" }}></div>
            <div className={styles["grid-line"]} style={{ top: "25%" }}></div>
            <div className={styles["grid-line"]} style={{ top: "50%" }}></div>
            <div className={styles["grid-line"]} style={{ top: "75%" }}></div>
          </div>

          <svg className={styles["chart-svg-content"]} viewBox="0 0 700 136">
            <defs>
              <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area Created */}
            <path d={createdArea} fill="url(#createdGrad)" />
            {/* Stroke line Created */}
            <path d={createdPath} fill="transparent" stroke="#6366f1" strokeWidth="2.5" />

            {/* Area Completed */}
            <path d={completedArea} fill="url(#completedGrad)" />
            {/* Stroke line Completed */}
            <path d={completedPath} fill="transparent" stroke="#10b981" strokeWidth="2.5" />

            {/* Draw dots */}
            {createdPoints.map((pt, i) => (
              <circle key={`c-dot-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#6366f1" stroke="#fff" strokeWidth="1" />
            ))}
            {completedPoints.map((pt, i) => (
              <circle key={`cp-dot-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#10b981" stroke="#fff" strokeWidth="1" />
            ))}
          </svg>

          <div className={styles["axis-x-labels"]}>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles["spinner-container"]}>
        <div className={styles["spinner"]} />
        <p className={styles["spinner-text"]}>Đang tải Leader Dashboard...</p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className={styles["leader-layout"]}>

      {/* ═══════════════════════════════════════ SIDEBAR ══════════════════ */}
      <aside className={styles["sidebar"]}>
        {/* Logo */}
        <div className={styles["sidebar-header"]}>
          <div className={styles["logo-row"]}>
            <div className={styles["logo-icon"]}>F</div>
            <div>
              <div className={styles["logo-text"]}>Flowspace</div>
              <div className={styles["logo-sub"]}>Leader</div>
            </div>
          </div>
        </div>

        {/* Workspace selector */}
        <div className={styles["workspace-selector-container"]}>
          <button
            className={styles["workspace-selector-btn"]}
            onClick={() => setWsDdOpen(!wsDdOpen)}
          >
            <div className={styles["workspace-avatar"]}>
              {getInitials(currentWsName)}
            </div>
            <div className={styles["workspace-meta"]}>
              <span className={styles["workspace-active-name"]}>{currentWsName}</span>
              <span className={styles["workspace-active-role"]}>
                {uncompletedTaskCount} Uncompleted
              </span>
            </div>
            <i className={`bi bi-chevron-down ${styles["chevron-icon"]} ${wsDdOpen ? styles["open"] : ""}`}></i>
          </button>

          {wsDdOpen && (
            <div className={styles["workspace-dropdown"]}>
              <p className={styles["dropdown-section-title"]}>Your Workspaces</p>
              {userWs.filter(ws => ws.uncompletedTaskCount > 0 || ws.workspaceId === user?.workspaceId).map((ws, i) => (
                <button
                  key={i}
                  className={`${styles["workspace-dropdown-item"]} ${ws.workspaceId === user?.workspaceId ? styles["active"] : ""}`}
                  onClick={() => handleSwitchWs(ws.workspaceId)}
                >
                  <div className={styles["workspace-item-avatar"]}>
                    {getInitials(ws.workspaceName)}
                  </div>
                  <div className={styles["workspace-item-meta"]}>
                    <span className={styles["workspace-item-name"]}>{ws.workspaceName}</span>
                    <span className={styles["workspace-item-role"]}>
                      {ws.uncompletedTaskCount} Uncompleted
                    </span>
                  </div>
                  {ws.workspaceId === user?.workspaceId && (
                    <i className={`bi bi-check ${styles["check-icon"]}`}></i>
                  )}
                </button>
              ))}

              <button
                className={styles["dropdown-action-btn"]}
                onClick={() => {
                  setWsDdOpen(false);
                  setShowCreateWorkspaceModal(true);
                }}
              >
                <i className={`bi bi-plus-lg ${styles["action-icon"]}`}></i>
                <span>Create workspace</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <span className={styles["menu-label"]}>Menu</span>
        <nav className={styles["sidebar-nav"]}>
          {(
            [
              { key: "dashboard", icon: "bi-grid-fill", label: "Dashboard" },
              { key: "projects", icon: "bi-folder-fill", label: "My projects" },
              ...(user?.role !== "MEMBER" ? [{ key: "members", icon: "bi-people-fill", label: "Members" }] : []),
              { key: "history", icon: "bi-clock-history", label: "Workspace history" },
              { key: "profile", icon: "bi-person-fill", label: "Profile" },
            ] as { key: ActiveTab; icon: string; label: string }[]
          ).map(({ key, icon, label }) => (
            <button
              key={key}
              className={`${styles["nav-item"]} ${activeTab === key ? styles["active"] : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <i className={`bi ${icon} ${styles["nav-icon"]}`} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className={styles["sidebar-footer"]}>
          <button className={styles["logout-btn"]} onClick={logout}>
            <i className="bi bi-box-arrow-right" />
            <span>Logout</span>
          </button>
        </div>
        <div className={styles["sidebar-role-badge"]}>⬡ {user?.role === "MEMBER" ? "Member" : "Leader"}</div>
      </aside>

      {/* ═══════════════════════════════════════ MAIN ═════════════════════ */}
      <main className={styles["main-area"]}>

        {/* Topbar */}
        <header className={styles["topbar"]}>
          <div className={styles["search-wrap"]}>
            <i className="bi bi-search" />
            <input
              type="text"
              placeholder="Search projects, tasks, users..."
              className={styles["search-input"]}
            />
            <span className={styles["search-kbd"]}>⌘k</span>
          </div>

          <div className={styles["topbar-right"]}>
            <button className={styles["bell-btn"]}>
              <i className="bi bi-bell" />
              <span className={styles["bell-badge"]} />
            </button>

            <div style={{ position: "relative" }}>
              <button className={styles["user-trigger"]} onClick={() => setUserDdOpen(!userDdOpen)}>
                <div className={styles["user-avatar-sm"]}>{getInitials(user?.username || "")}</div>
                <div className={styles["user-meta-sm"]}>
                  <span className={styles["user-name-sm"]}>{user?.username}</span>
                  <span className={styles["user-role-sm"]}>Leader</span>
                </div>
                <i className="bi bi-chevron-down" style={{ fontSize: "0.7rem", color: "#64748b" }} />
              </button>

              {userDdOpen && (
                <div className={styles["user-dropdown"]}>
                  <button className={styles["user-dropdown-item"]} onClick={() => { setUserDdOpen(false); setActiveTab("profile"); }}>
                    <i className="bi bi-person" /> Profile
                  </button>
                  <button className={`${styles["user-dropdown-item"]} ${styles["danger"]}`} onClick={() => { setUserDdOpen(false); logout(); }}>
                    <i className="bi bi-box-arrow-right" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <section className={styles["content-body"]}>

          {/* Alerts */}
          {successMsg && (
            <div className={`${styles["alert"]} ${styles["success"]}`}>
              <i className="bi bi-check-circle-fill" /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className={`${styles["alert"]} ${styles["error"]}`}>
              <i className="bi bi-exclamation-triangle-fill" /> {errorMsg}
            </div>
          )}

          {/* ══════════════ TAB: DASHBOARD ══════════════ */}
          {activeTab === "dashboard" && (
            <>
              {/* Breadcrumb + title */}
              <div className={styles["breadcrumb"]}>
                <span>Home</span>
                <i className="bi bi-chevron-right" style={{ fontSize: "0.65rem" }} />
                <span style={{ color: "#0f172a", fontWeight: 600 }}>Leader</span>
              </div>

              <div className={styles["page-header-row"]}>
                <div>
                  <h1 className={styles["page-title"]}>Dashboard</h1>
                  <p className={styles["page-sub"]}>Welcome back, {user?.username}!</p>
                </div>
                <div className={styles["header-actions"]}>
                  {user?.role !== "MEMBER" && (
                    <button className={styles["btn-primary"]} onClick={() => setShowCreateTask(true)}>
                      <i className="bi bi-plus-lg" /> Assign task
                    </button>
                  )}
                </div>
              </div>

              {/* Top row: My projects + My members */}
              <div className={styles["dash-top"]}>
                {/* My projects */}
                <div className={styles["card"]}>
                  <div className={styles["card-header"]}>
                    <h2 className={styles["card-title"]}>My projects</h2>
                    <span className={styles["card-badge"]}>{projects.length} active</span>
                  </div>

                  {projects.length === 0 ? (
                    <div className={styles["empty-state"]}>
                      <i className={`bi bi-folder-x ${styles["empty-icon"]}`} />
                      <p className={styles["empty-title"]}>No projects yet</p>
                      <p className={styles["empty-sub"]}>No projects available.</p>
                      {user?.role !== "MEMBER" && (
                        <button className={styles["btn-primary"]} onClick={() => setShowCreateProject(true)}>
                          <i className="bi bi-plus-lg" /> New project
                        </button>
                      )}
                    </div>
                  ) : (
                    projects.map(p => {
                      const pct = p.taskCount > 0 ? Math.round((p.completedTaskCount / p.taskCount) * 100) : 0;
                      const firstDeadline = allTasks.find(t => t.projectId === p.id)?.deadline;
                      return (
                        <div key={p.id} className={styles["project-row"]} onClick={() => { setSelectedProjectId(p.id); setActiveTab("project_detail"); }}>
                          <div className={styles["project-row-top"]}>
                            <span className={styles["project-name"]}>{p.name}</span>
                            {firstDeadline && (
                              <span className={`${styles["due-badge"]} ${isOverdue(firstDeadline) ? styles["overdue"] : ""}`}>
                                Due {formatDue(firstDeadline)}
                              </span>
                            )}
                          </div>
                          <div className={styles["progress-wrap"]}>
                            <div className={styles["progress-fill"]} style={{ width: `${pct}%` }} />
                          </div>
                          <div className={styles["progress-pct"]}>{pct}%</div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* My members */}
                <div className={styles["card"]}>
                  <div className={styles["card-header"]}>
                    <h2 className={styles["card-title"]}>My members</h2>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 0" }}>
                    {wsMembers.filter(m => m.active).slice(0, 7).map((m, i) => (
                      <div
                        key={m.id}
                        className={`${styles["member-avatar"]} ${styles[avatarColor(i)]}`}
                        title={`${m.username} - ${m.roleName}`}
                        style={{
                          width: "42px",
                          height: "42px",
                          fontSize: "1.1rem",
                          border: "2px solid #fff",
                          marginLeft: i > 0 ? "-12px" : "0",
                          position: "relative",
                          zIndex: 10 - i
                        }}
                      >
                        {getInitials(m.username)}
                      </div>
                    ))}
                    {wsMembers.filter(m => m.active).length > 7 && (
                      <div
                        className={styles["member-avatar"]}
                        style={{
                          width: "42px",
                          height: "42px",
                          fontSize: "0.95rem",
                          backgroundColor: "#f1f5f9",
                          color: "#64748b",
                          border: "2px solid #fff",
                          marginLeft: "-12px",
                          position: "relative",
                          zIndex: 0
                        }}
                        title={`${wsMembers.filter(m => m.active).length - 7} more members`}
                      >
                        +{wsMembers.filter(m => m.active).length - 7}
                      </div>
                    )}
                  </div>
                  {wsMembers.length === 0 && (
                    <div className={styles["empty-state"]}>
                      <p className={styles["empty-sub"]}>No members yet</p>
                      {user?.role !== "MEMBER" && (
                        <button className={styles["btn-primary"]} onClick={() => setShowInvite(true)}>
                          Invite member
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom row: Task completion + Weekly Activity + Deadlines + Activities */}
              <div className={styles["dash-bottom"]}>
                {/* Task completion chart */}
                <div className={styles["card"]}>
                  <div className={styles["card-header"]}>
                    <h2 className={styles["card-title"]}>Task completion</h2>
                    <span className={styles["chart-badge"]}>
                      +{doneTasks.length > 0 ? Math.round((doneTasks.length / Math.max(allTasks.length, 1)) * 100) : 18}% vs. last cycle
                    </span>
                  </div>
                  {renderStatusDonutChart()}
                </div>

                {/* Weekly Activity */}
                <div className={styles["card"]}>
                  <div className={styles["card-header"]}>
                    <h2 className={styles["card-title"]}>Weekly activity</h2>
                  </div>
                  {renderWeeklyActivityChart()}
                </div>

                {/* Upcoming deadlines */}
                <div className={styles["card"]}>
                  <div className={styles["card-header"]}>
                    <h2 className={styles["card-title"]}>Upcoming deadlines</h2>
                  </div>
                  {allTasks.filter(t => t.deadline && t.status !== "DONE").slice(0, 5).map((t, i) => {
                    const variant = deadlineVariant(t.deadline);
                    const iconMap = { overdue: "bi-clock-history", upcoming: "bi-exclamation-circle", normal: "bi-calendar3" };
                    return (
                      <div key={i} className={styles["deadline-row"]}>
                        <div className={`${styles["deadline-icon"]} ${styles[variant]}`}>
                          <i className={`bi ${iconMap[variant]}`} />
                        </div>
                        <div>
                          <div className={styles["deadline-title"]}>{t.projectName} · {t.title}</div>
                          <div className={styles["deadline-date"]}>{formatDue(t.deadline)}</div>
                        </div>
                      </div>
                    );
                  })}
                  {allTasks.filter(t => t.deadline && t.status !== "DONE").length === 0 && (
                    <div className={styles["empty-state"]}>
                      <i className={`bi bi-calendar-check ${styles["empty-icon"]}`} />
                      <p className={styles["empty-sub"]}>No upcoming deadlines</p>
                    </div>
                  )}
                </div>

                {/* Recent activities */}
                <div className={styles["card"]}>
                  <div className={styles["card-header"]}>
                    <h2 className={styles["card-title"]}>Recent activities</h2>
                  </div>
                  {allTasks.slice(0, 5).map((t, i) => (
                    <div key={i} className={styles["activity-row"]}>
                      <div className={styles["activity-dot"]} />
                      <div className={styles["activity-info"]}>
                        <div className={styles["activity-text"]}>
                          <strong>{t.assigneeUsername || "Unassigned"}</strong>{" "}
                          {t.status === "DONE" ? "completed" : t.status === "IN_PROGRESS" ? "is working on" : "opened"}{" "}
                          <strong>{t.title}</strong>
                        </div>
                        <div className={styles["activity-time"]}>{t.projectName}</div>
                      </div>
                    </div>
                  ))}
                  {allTasks.length === 0 && (
                    <div className={styles["empty-state"]}>
                      <p className={styles["empty-sub"]}>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══════════════ TAB: PROJECTS ══════════════ */}
          {activeTab === "projects" && (
            <>
              <div className={styles["page-header-row"]}>
                <div>
                  <h1 className={styles["page-title"]}>My Projects</h1>
                  <p className={styles["page-sub"]}>Projects you lead in this workspace</p>
                </div>
                {user?.role !== "MEMBER" && (
                  <button className={styles["btn-primary"]} onClick={() => setShowCreateProject(true)}>
                    <i className="bi bi-plus-lg" /> New project
                  </button>
                )}
              </div>

              {projects.length === 0 ? (
                <div className={`${styles["card"]} ${styles["empty-state"]}`}>
                  <i className={`bi bi-folder-x ${styles["empty-icon"]}`} />
                  <p className={styles["empty-title"]}>No projects</p>
                  <p className={styles["empty-sub"]}>Create your first project</p>
                  {user?.role !== "MEMBER" && (
                    <button className={styles["btn-primary"]} onClick={() => setShowCreateProject(true)}>
                      <i className="bi bi-plus-lg" /> New project
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                  {projects.map((p, i) => {
                    const pct = p.taskCount > 0 ? Math.round((p.completedTaskCount / p.taskCount) * 100) : 0;
                    return (
                      <div key={p.id} className={styles["card"]} style={{ cursor: "pointer" }} onClick={() => { setSelectedProjectId(p.id); setActiveTab("project_detail"); }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                          <div className={`${styles["member-avatar"]} ${styles[avatarColor(i)]}`} style={{ borderRadius: "10px" }}>
                            {getInitials(p.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{p.name}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{p.members.length}{p.maxMembers ? `/${p.maxMembers}` : ""} members · {p.taskCount} tasks</div>
                          </div>
                        </div>
                        {p.description && <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "14px" }}>{p.description}</p>}
                        <div className={styles["progress-wrap"]}>
                          <div className={styles["progress-fill"]} style={{ width: `${pct}%` }} />
                        </div>
                        <div className={styles["progress-pct"]}>{pct}% completed</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ══════════════ TAB: MEMBERS ══════════════ */}
          {activeTab === "members" && (
            <>
              <div className={styles["page-header-row"]}>
                <div>
                  <h1 className={styles["page-title"]}>Members</h1>
                  <p className={styles["page-sub"]}>Workspace members you can assign to projects</p>
                </div>
                <button className={styles["btn-primary"]} onClick={() => setShowInvite(true)}>
                  <i className="bi bi-person-plus-fill" /> Invite member
                </button>
              </div>

              <div className={styles["card"]}>
                {wsMembers.filter(m => m.active).map((m, i) => (
                  <div key={m.id} className={styles["member-row"]}>
                    <div className={`${styles["member-avatar"]} ${styles[avatarColor(i)]}`}>
                      {getInitials(m.username)}
                    </div>
                    <div className={styles["member-info"]}>
                      <div className={styles["member-name"]}>{m.username}</div>
                      <div className={styles["member-role"]}>{m.email} · {m.roleName}</div>
                    </div>
                    <span style={{ fontSize: "0.72rem", background: "#f1f5f9", padding: "3px 9px", borderRadius: "6px", color: "#64748b", fontWeight: 600 }}>
                      {m.roleName}
                    </span>
                  </div>
                ))}
                {wsMembers.filter(m => m.active).length === 0 && (
                  <div className={styles["empty-state"]}>
                    <i className={`bi bi-people ${styles["empty-icon"]}`} />
                    <p className={styles["empty-title"]}>No active members</p>
                    <button className={styles["btn-primary"]} onClick={() => setShowInvite(true)}>Invite member</button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════════ TAB: PROJECT DETAIL ══════════════ */}
          {activeTab === "project_detail" && selectedProjectId !== null && (() => {
            const project = projects.find(p => p.id === selectedProjectId);
            if (!project) return null;
            let projectTasks = allTasks.filter(t => t.projectId === selectedProjectId);

            if (taskSearch.trim()) {
              const query = taskSearch.toLowerCase();
              projectTasks = projectTasks.filter(t => t.title.toLowerCase().includes(query) || (t.description || "").toLowerCase().includes(query));
            }
            if (taskStatusFilter !== "ALL") {
              projectTasks = projectTasks.filter(t => t.status === taskStatusFilter);
            }
            if (taskPriorityFilter !== "ALL") {
              projectTasks = projectTasks.filter(t => t.priority === taskPriorityFilter);
            }

            // Pagination logic for list
            const pageSize = 10;
            const totalPages = Math.ceil(projectTasks.length / pageSize) || 1;
            const paginatedTasks = projectTasks.slice((listCurrentPage - 1) * pageSize, listCurrentPage * pageSize);

            return (
              <>
                <div className={styles["breadcrumb"]} style={{ marginBottom: "16px" }}>
                  <span style={{ cursor: "pointer" }} onClick={() => setActiveTab("projects")}>Home</span>
                  <i className="bi bi-chevron-right" style={{ fontSize: "0.65rem", margin: "0 8px" }} />
                  <span style={{ cursor: "pointer" }} onClick={() => setActiveTab("projects")}>Projects</span>
                  <i className="bi bi-chevron-right" style={{ fontSize: "0.65rem", margin: "0 8px" }} />
                  <span style={{ color: "#0f172a", fontWeight: 600 }}>{project.name}</span>
                </div>

                <div className={styles["page-header-row"]} style={{ marginBottom: "16px" }}>
                  <div>
                    <h1 className={styles["page-title"]}>{project.name}</h1>
                    <p className={styles["page-sub"]}>Welcome back — here's what's happening today.</p>
                  </div>
                  <button className={styles["btn-primary"]} onClick={() => { setTaskProject(project.id); setShowCreateTask(true); }}>
                    <i className="bi bi-plus-lg" /> New task
                  </button>
                </div>

                <div className={styles["card"]} style={{ marginBottom: "16px" }}>
                  <div className={styles["card-header"]} style={{ marginBottom: "12px" }}>
                    <h2 className={styles["card-title"]}>Project members</h2>
                    <span className={styles["card-badge"]}>{project.members.length}{project.maxMembers ? ` / ${project.maxMembers}` : ""} members</span>
                  </div>

                    {(() => {
                      const isProjectLeader = project.leaderId === user?.id;
                      return (
                        <>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                            {project.members.map((member) => {
                              const isSelf = member.id === user?.id;
                              return (
                        <div
                          key={member.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            borderRadius: "999px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0"
                          }}
                        >
                          <div
                            className={`${styles["member-avatar"]} ${styles["av-indigo"]}`}
                            style={{ width: "28px", height: "28px", fontSize: "0.68rem", borderRadius: "999px" }}
                          >
                            {getInitials(member.username)}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                              {member.username}
                              {member.id === project.leaderId && (
                                <span style={{ marginLeft: "6px", fontSize: "0.65rem", background: "#4f46e5", color: "#fff", padding: "1px 7px", borderRadius: "999px", fontWeight: 700 }}>Leader</span>
                              )}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{member.email}</span>
                          </div>
                          {isProjectLeader && !isSelf && member.id !== project.leaderId && (
                            <button
                              title="Xóa khỏi project"
                              disabled={manageMembersActionLoading}
                              onClick={() => handleRemoveMemberFromProject(project.id, member.id, member.username)}
                              style={{ marginLeft: "4px", background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "0.85rem", padding: "2px 4px", borderRadius: "4px", display: "flex", alignItems: "center" }}
                            >
                              <i className="bi bi-person-dash" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isProjectLeader && (
                    <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", padding: "16px", borderRadius: "12px", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <i className="bi bi-person-plus" style={{ color: "#4f46e5", fontSize: "1.1rem" }} />
                        <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }}>Thêm thành viên Project</span>
                      </div>
                      <button
                        type="button"
                        className={styles["btn-primary"]}
                        style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "8px" }}
                        onClick={() => handleOpenAddMembers(project.id)}
                      >
                        <i className="bi bi-plus-lg" />
                        Add Members
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
                </div>

                <div className={styles["view-toggle"]} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      className={styles["form-input"]}
                      style={{ width: "200px" }}
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                    />
                    <select
                      className={styles["form-select"]}
                      style={{ width: "150px" }}
                      value={taskStatusFilter}
                      onChange={(e) => setTaskStatusFilter(e.target.value as "ALL" | TaskStatus)}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">Review</option>
                      <option value="DONE">Done</option>
                    </select>
                    <select
                      className={styles["form-select"]}
                      style={{ width: "150px" }}
                      value={taskPriorityFilter}
                      onChange={(e) => setTaskPriorityFilter(e.target.value as "ALL" | TaskPriority)}
                    >
                      <option value="ALL">All Priorities</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                    {(taskSearch || taskStatusFilter !== "ALL" || taskPriorityFilter !== "ALL") && (
                      <button
                        className={styles["btn-outline"]}
                        onClick={() => { setTaskSearch(""); setTaskStatusFilter("ALL"); setTaskPriorityFilter("ALL"); }}
                        style={{ height: "42px" }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className={`${styles["view-btn"]} ${projectViewMode === "list" ? styles["active"] : ""}`} onClick={() => setProjectViewMode("list")}>
                      <i className="bi bi-list-task" /> List
                    </button>
                    <button className={`${styles["view-btn"]} ${projectViewMode === "board" ? styles["active"] : ""}`} onClick={() => setProjectViewMode("board")}>
                      <i className="bi bi-kanban" /> Board
                    </button>
                  </div>
                </div>

                {projectViewMode === "list" && (
                  <div className={styles["card"]} style={{ padding: "0" }}>
                    <table className={styles["task-table"]}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Task</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Assignee</th>
                          <th>Due</th>
                          <th style={{ width: "60px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTasks.map(t => (
                          <tr key={t.id} onClick={() => { setSelectedTaskId(t.id); setActiveTab("task_detail"); }} style={{ cursor: "pointer" }}>
                            <td style={{ color: "#94a3b8" }}>#{t.id}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{t.title}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>in {t.projectName}</div>
                            </td>
                            <td>
                              <span className={`${styles["status-badge"]} ${styles[t.status]}`}>{t.status.replace("_", " ")}</span>
                            </td>
                            <td>
                              <span className={`${styles["priority-badge"]} ${styles[t.priority]}`}>{t.priority}</span>
                            </td>
                            <td>
                              {t.assigneeUsername ? (
                                <div className={`${styles["member-avatar"]} ${styles["av-indigo"]}`} style={{ width: "24px", height: "24px", fontSize: "0.6rem" }}>
                                  {getInitials(t.assigneeUsername)}
                                </div>
                              ) : "-"}
                            </td>
                            <td style={{ fontSize: "0.8rem", color: t.deadline && isOverdue(t.deadline) ? "#ef4444" : "#64748b" }}>
                              {t.deadline ? formatDue(t.deadline) : "-"}
                            </td>
                            <td style={{ textAlign: "right", paddingRight: "16px" }}>
                              {t.status === "REVIEW" && (
                                <button
                                  className={styles["btn-success"]}
                                  style={{ padding: "4px 8px", fontSize: "1rem", borderRadius: "6px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
                                  onClick={(e) => { e.stopPropagation(); void handleUpdateTaskStatus(t.id, "DONE"); }}
                                  title="Duyệt nhanh (Approve)"
                                >
                                  <i className="bi bi-check-lg" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        Showing {(listCurrentPage - 1) * pageSize + (projectTasks.length > 0 ? 1 : 0)}-{Math.min(listCurrentPage * pageSize, projectTasks.length)} of {projectTasks.length} tasks
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className={styles["page-btn"]} disabled={listCurrentPage === 1} onClick={() => setListCurrentPage(prev => prev - 1)}>
                          <i className="bi bi-chevron-left" />
                        </button>
                        {Array.from({ length: totalPages }).map((_, idx) => (
                          <button key={idx} className={`${styles["page-btn"]} ${listCurrentPage === idx + 1 ? styles["active"] : ""}`} onClick={() => setListCurrentPage(idx + 1)}>
                            {idx + 1}
                          </button>
                        ))}
                        <button className={styles["page-btn"]} disabled={listCurrentPage === totalPages} onClick={() => setListCurrentPage(prev => prev + 1)}>
                          <i className="bi bi-chevron-right" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {projectViewMode === "board" && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "16px" }}>
                    {(["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as TaskStatus[]).map(s => (
                      <div
                        key={s}
                        className={`${styles["card"]} ${dropTargetStatus === s ? styles["drag-over"] : ""}`}
                        style={{ background: dropTargetStatus === s ? "#f1f5f9" : "#f8fafc", transition: "background 0.2s" }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDropTargetStatus(s);
                        }}
                        onDragLeave={(event) => handleColumnDragLeave(event, s)}
                        onDrop={(event) => void handleTaskDrop(event, s)}
                      >
                        <div className={styles["card-header"]}>
                          <span className={styles["card-title"]} style={{ fontSize: "0.82rem" }}>
                            {s.replace("_", " ")}
                          </span>
                          <span className={styles["card-badge"]}>{projectTasks.filter(t => t.status === s).length}</span>
                        </div>
                        {projectTasks.filter(t => t.status === s).map(t => {
                          const isUpdating = statusUpdateTaskId === t.id;
                          const isDragging = draggingTaskId === t.id;
                          return (
                            <div
                              key={t.id}
                              onClick={() => { setSelectedTaskId(t.id); setActiveTab("task_detail"); }}
                              draggable
                              onDragStart={(event) => handleTaskDragStart(event, t)}
                              onDragEnd={() => {
                                setDraggingTaskId(null);
                                setDropTargetStatus(null);
                              }}
                              style={{
                                background: "#fff",
                                borderRadius: "8px",
                                padding: "12px",
                                marginBottom: "8px",
                                border: "1px solid #e2e8f0",
                                cursor: "pointer",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                opacity: isUpdating || isDragging ? 0.5 : 1,
                                transform: isDragging ? "scale(0.98)" : "none"
                              }}
                            >
                              <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <span style={{ paddingRight: "8px" }}>{t.title}</span>
                                {t.status === "REVIEW" && (
                                  <button
                                    className={styles["btn-success"]}
                                    style={{ padding: "2px 6px", fontSize: "0.9rem", borderRadius: "4px", flexShrink: 0 }}
                                    onClick={(e) => { e.stopPropagation(); void handleUpdateTaskStatus(t.id, "DONE"); }}
                                    title="Duyệt nhanh (Approve)"
                                  >
                                    <i className="bi bi-check-lg" />
                                  </button>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className={`${styles["priority-badge"]} ${styles[t.priority]}`}>{t.priority}</span>
                                {t.deadline && <span style={{ fontSize: "0.68rem", color: isOverdue(t.deadline) ? "#ef4444" : "#64748b" }}>{formatDue(t.deadline)}</span>}
                              </div>
                            </div>
                          );
                        })}
                        {projectTasks.filter(t => t.status === s).length === 0 && (
                          <p style={{ fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>Empty</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          {/* ══════════════ TAB: TASK DETAIL ══════════════ */}
          {activeTab === "task_detail" && selectedTaskId !== null && (() => {
            const task = allTasks.find(t => t.id === selectedTaskId);
            if (!task) return null;
            const project = projects.find(p => p.id === task.projectId);

            return (
              <>
                <div className={styles["breadcrumb"]} style={{ marginBottom: "16px" }}>
                  <span style={{ cursor: "pointer" }} onClick={() => setActiveTab("projects")}>Home</span>
                  <i className="bi bi-chevron-right" style={{ fontSize: "0.65rem", margin: "0 8px" }} />
                  <span style={{ cursor: "pointer" }} onClick={() => setActiveTab("projects")}>Projects</span>
                  <i className="bi bi-chevron-right" style={{ fontSize: "0.65rem", margin: "0 8px" }} />
                  <span style={{ cursor: "pointer" }} onClick={() => { setSelectedProjectId(task.projectId); setActiveTab("project_detail"); }}>{project?.name || task.projectName}</span>
                  <i className="bi bi-chevron-right" style={{ fontSize: "0.65rem", margin: "0 8px" }} />
                  <span style={{ color: "#0f172a", fontWeight: 600 }}>Task #{task.id}</span>
                </div>

                <div className={styles["page-header-row"]} style={{ marginBottom: "16px" }}>
                  <div>
                    <h1 className={styles["page-title"]}>Task detail</h1>
                    <p className={styles["page-sub"]}>Welcome back — here's what's happening today.</p>
                  </div>
                  <div className={styles["header-actions"]}>
                    <button className={styles["btn-outline"]}><i className="bi bi-link-45deg" /> Copy link</button>
                  </div>
                </div>

                <div className={styles["task-detail-grid"]}>
                  <div className={styles["task-detail-main"]}>
                    <div className={styles["card"]} style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "8px" }}>#{task.id} in {task.projectName}</div>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>{task.title}</h2>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                        <span className={`${styles["status-badge"]} ${styles[task.status]}`}>{task.status.replace("_", " ")}</span>
                        <span className={`${styles["priority-badge"]} ${styles[task.priority]}`}>{task.priority}</span>
                        {task.deadline && (
                          <span style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px" }}>
                            <i className="bi bi-clock" /> Due {formatDue(task.deadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles["card"]}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "12px" }}>Description</h3>
                      <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {task.description || "No description provided."}
                      </div>
                    </div>

                    <div className={styles["card"]}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>Comments</h3>
                      <div className={styles["comments-list"]}>
                        {taskComments.length === 0 ? (
                          <div style={{ fontSize: "0.9rem", color: "#94a3b8", fontStyle: "italic", marginBottom: "16px" }}>
                            No comments yet.
                          </div>
                        ) : (
                          taskComments.map(c => (
                            <div key={c.id} className={styles["comment-item"]}>
                              <div className={`${styles["member-avatar"]} ${styles[avatarColor(c.userId)]}`} style={{ width: "32px", height: "32px", fontSize: "0.85rem", flexShrink: 0 }}>
                                {getInitials(c.username)}
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
                          style={{ minHeight: "80px", marginBottom: "8px", resize: "vertical" }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            className={styles["btn-primary"]}
                            onClick={() => void handleAddComment()}
                            disabled={!newComment.trim()}
                          >
                            <i className="bi bi-send" /> Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles["task-detail-sidebar"]}>
                    <div className={styles["card"]}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>Properties</h3>

                      <div className={styles["property-row"]}>
                        <div className={styles["property-label"]}><i className="bi bi-flag" /> Status</div>
                        <div className={styles["property-value"]}>
                          <select
                            value={task.status}
                            onChange={(e) => void handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                            className={styles["form-select"]}
                            style={{ padding: "4px 8px", fontSize: "0.85rem", height: "auto", width: "100%", background: task.status === "DONE" ? "#f0fdf4" : "#fff" }}
                          >
                            <option value="TODO">To do</option>
                            <option value="IN_PROGRESS">In progress</option>
                            <option value="REVIEW">Review</option>
                            <option value="DONE">Done (Approve)</option>
                          </select>
                        </div>
                      </div>

                      <div className={styles["property-row"]}>
                        <div className={styles["property-label"]}><i className="bi bi-exclamation-triangle" /> Priority</div>
                        <div className={styles["property-value"]}><span className={`${styles["priority-badge"]} ${styles[task.priority]}`}>{task.priority}</span></div>
                      </div>

                      <div className={styles["property-row"]}>
                        <div className={styles["property-label"]}><i className="bi bi-person" /> Assignee</div>
                        <div className={styles["property-value"]}>
                          {task.assigneeUsername ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <div className={`${styles["member-avatar"]} ${styles["av-indigo"]}`} style={{ width: "20px", height: "20px", fontSize: "0.6rem" }}>
                                {getInitials(task.assigneeUsername)}
                              </div>
                              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{task.assigneeUsername}</span>
                            </div>
                          ) : <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Unassigned</span>}
                        </div>
                      </div>

                      <div className={styles["property-row"]}>
                        <div className={styles["property-label"]}><i className="bi bi-calendar-event" /> Deadline</div>
                        <div className={styles["property-value"]} style={{ fontSize: "0.85rem", color: "#334155" }}>
                          {task.deadline ? formatDue(task.deadline) : "None"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {/* ══════════════ TAB: PROFILE ══════════════ */}
          {activeTab === "profile" && (
            <>
              <h1 className={styles["page-title"]}>Profile</h1>
              <div className={styles["card"]} style={{ maxWidth: "480px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                  <div className={`${styles["member-avatar"]} ${styles["av-indigo"]}`} style={{ width: "52px", height: "52px", fontSize: "1rem", borderRadius: "14px" }}>
                    {getInitials(user?.username || "")}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{user?.username}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{user?.email}</div>
                    <div style={{ marginTop: "4px" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "var(--admin-primary-light)", color: "var(--admin-primary)", padding: "2px 8px", borderRadius: "6px" }}>
                        LEADER
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]}>Workspace</label>
                  <input className={styles["form-input"]} value={currentWsName} readOnly />
                </div>
                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]}>Email</label>
                  <input className={styles["form-input"]} value={user?.email || ""} readOnly />
                </div>
              </div>
            </>
          )}
          {activeTab === "history" && (
            <>
              <div className={styles["page-header-row"]}>
                <div>
                  <h1 className={styles["page-title"]}>Workspace History</h1>
                  <p className={styles["page-sub"]}>Lịch sử hoạt động và các task đã hoàn thành trên các Workspace.</p>
                </div>
              </div>

              <div className={styles["history-list"]}>
                {userWs.length === 0 ? (
                  <div className={styles["empty-state-history"]}>
                    <i className="bi bi-clock-history"></i>
                    <p>Bạn chưa tham gia Workspace nào.</p>
                  </div>
                ) : (
                  userWs.map((ws) => {
                    const isActive = ws.workspaceId === user?.workspaceId;
                    return (
                      <div
                        key={ws.workspaceId}
                        className={`${styles["history-card"]} ${!isActive ? styles["history-card-clickable"] : ""}`}
                        onClick={() => {
                          if (!isActive) {
                            handleSwitchWs(ws.workspaceId);
                          }
                        }}
                      >
                        <div className={styles["history-card-header"]}>
                          <div className={styles["history-card-info"]}>
                            <div className={styles["history-avatar"]}>
                              {getInitials(ws.workspaceName)}
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
                                Vai trò: <strong>{ws.roleName === "WORKSPACE_ADMIN" ? "Admin" : ws.roleName}</strong>
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
            </>
          )}

        </section>
      </main>

      {/* ══════════════════════════════════════ MODALS ════════════════════ */}

      {/* Create project modal */}
      {showCreateProject && (
        <div className={styles["modal-overlay"]} onClick={() => setShowCreateProject(false)}>
          <div className={styles["modal"]} onClick={e => e.stopPropagation()}>
            <h3 className={styles["modal-title"]}>New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>Project name *</label>
                <input className={styles["form-input"]} value={projName} onChange={e => setProjName(e.target.value)} placeholder="e.g. Atlas Q1 launch" required />
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>Description</label>
                <textarea className={styles["form-textarea"]} value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Optional description..." />
              </div>
              <div className={styles["modal-footer"]}>
                <button type="button" className={styles["btn-outline"]} onClick={() => setShowCreateProject(false)}>Cancel</button>
                <button type="submit" className={styles["btn-primary"]}>Create project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create task modal */}
      {showCreateTask && (
        <div className={styles["modal-overlay"]} onClick={() => setShowCreateTask(false)}>
          <div className={styles["modal"]} onClick={e => e.stopPropagation()}>
            <h3 className={styles["modal-title"]}>Assign Task</h3>
            <form onSubmit={handleCreateTask}>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>Title *</label>
                <input className={styles["form-input"]} value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title" required />
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>Project *</label>
                <select className={styles["form-select"]} value={taskProject} onChange={e => setTaskProject(Number(e.target.value))} required>
                  <option value={0}>-- Select project --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>Assignee</label>
                <select className={styles["form-select"]} value={taskAssignee} onChange={e => setTaskAssignee(Number(e.target.value))}>
                  <option value={0}>-- Unassigned --</option>
                  {wsMembers.filter(m => m.active).map(m => <option key={m.id} value={m.userId}>{m.username}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]}>Priority</label>
                  <select className={styles["form-select"]} value={taskPriority} onChange={e => setTaskPriority(e.target.value as TaskPriority)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]}>Deadline</label>
                  <input type="date" className={styles["form-input"]} value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} />
                </div>
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>Description</label>
                <textarea className={styles["form-textarea"]} value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Optional..." />
              </div>
              <div className={styles["modal-footer"]}>
                <button type="button" className={styles["btn-outline"]} onClick={() => setShowCreateTask(false)}>Cancel</button>
                <button type="submit" className={styles["btn-primary"]}>Create task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite member modal */}
      {showInvite && (
        <div className={styles["modal-overlay"]} onClick={() => setShowInvite(false)}>
          <div className={styles["modal"]} onClick={e => e.stopPropagation()}>
            <h3 className={styles["modal-title"]}>Invite Member</h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "16px" }}>
              Leaders can only invite with <strong>MEMBER</strong> role.
            </p>
            <form onSubmit={handleInvite}>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>Email address *</label>
                <input type="email" className={styles["form-input"]} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="member@example.com" required />
              </div>
              <div className={styles["modal-footer"]}>
                <button type="button" className={styles["btn-outline"]} onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className={styles["btn-primary"]}>Send invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Join Workspace Modal */}
      {showCreateWorkspaceModal && (
        <div className={styles["modal-overlay"]} onClick={() => setShowCreateWorkspaceModal(false)}>
          <div className={styles["modal"]} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 className={styles["modal-title"]} style={{ margin: 0 }}>Thêm Workspace mới</h2>
              <button style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }} onClick={() => setShowCreateWorkspaceModal(false)}>&times;</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {wsModalError && (
                <div style={{ padding: "10px", background: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid #fca5a5" }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: "6px" }}></i>
                  {wsModalError}
                </div>
              )}
              {wsModalSuccess && (
                <div style={{ padding: "10px", background: "#f0fdf4", color: "#15803d", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid #86efac" }}>
                  <i className="bi bi-check-circle-fill" style={{ marginRight: "6px" }}></i>
                  {wsModalSuccess}
                </div>
              )}

              {/* Phần tạo mới */}
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                  Tạo Workspace mới
                </h3>
                <form onSubmit={handleCreateNewWorkspaceSubmit}>
                  <div className={styles["form-group"]}>
                    <label className={styles["form-label"]}>Tên Workspace <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="text"
                      className={styles["form-input"]}
                      placeholder="Ví dụ: Team Alpha..."
                      value={newWSNameInput}
                      onChange={(e) => setNewWSNameInput(e.target.value)}
                      disabled={wsModalLoading}
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label className={styles["form-label"]}>Mô tả (Không bắt buộc)</label>
                    <textarea
                      className={styles["form-textarea"]}
                      placeholder="Nhập mô tả ngắn gọn về không gian làm việc này..."
                      value={newWSDescInput}
                      onChange={(e) => setNewWSDescInput(e.target.value)}
                      disabled={wsModalLoading}
                      rows={2}
                    ></textarea>
                  </div>
                  <div style={{ textAlign: "right", marginTop: "12px" }}>
                    <button type="submit" className={styles["btn-primary"]} disabled={wsModalLoading}>
                      {wsModalLoading ? "Đang xử lý..." : "Khởi tạo"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Phần tham gia */}
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                  Hoặc Tham gia bằng Mã mời
                </h3>
                <form onSubmit={handleJoinNewWorkspaceSubmit}>
                  <div className={styles["form-group"]}>
                    <label className={styles["form-label"]}>Mã mời (Invite Code) <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="text"
                      className={styles["form-input"]}
                      placeholder="Nhập mã mời 6 chữ số..."
                      value={joinWSCodeInput}
                      onChange={(e) => setJoinWSCodeInput(e.target.value.toUpperCase())}
                      disabled={wsModalLoading}
                    />
                  </div>
                  <div style={{ textAlign: "right", marginTop: "12px" }}>
                    <button type="submit" className={styles["btn-primary"]} disabled={wsModalLoading}>
                      {wsModalLoading ? "Đang xử lý..." : "Tham gia ngay"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showManageMembersModal && (() => {
        const proj = projects.find(p => p.id === manageMembersProjectId);
        const currentMemberIds = proj ? proj.members.map(m => m.id) : [];
        return (
        <div className={styles["modal-overlay"]} onClick={() => setShowManageMembersModal(false)}>
          <div className={styles["modal"]} style={{ maxWidth: "600px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div className={styles["modal-header"]}>
              <h2 className={styles["modal-title"]}>Thêm thành viên Project</h2>
            </div>
            
            <div className={styles["modal-body"]}>
              <div className={styles["manage-members-toolbar"]} style={{ marginBottom: "16px" }}>
                <div className={`${styles["input-group"]} ${styles["manage-members-search"]}`} style={{ position: "relative", width: "100%" }}>
                  <i className="bi bi-search input-icon" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                  <input
                    type="text"
                    className={styles["form-input"]}
                    style={{ paddingLeft: "34px", height: "40px", width: "100%" }}
                    placeholder="Tìm kiếm theo Tên hoặc Email..."
                    value={manageMembersSearch}
                    onChange={(e) => setManageMembersSearch(e.target.value)}
                  />
                </div>

              </div>

              <div className={styles["manage-members-list"]}>
                {wsMembers
                  .filter(m => m.active && !currentMemberIds.includes(m.userId))
                  .filter(m => 
                    m.username.toLowerCase().includes(manageMembersSearch.toLowerCase()) || 
                    m.email.toLowerCase().includes(manageMembersSearch.toLowerCase())
                  )
                  .map(member => (
                    <label key={member.userId} className={styles["manage-member-row"]}>
                      <input
                        type="checkbox"
                        className={styles["manage-member-checkbox"]}
                        checked={selectedMemberIds.includes(member.userId)}
                        onChange={() => handleToggleManageMember(member.userId)}
                      />
                      <div className={styles["manage-member-info"]}>
                        <span className={styles["manage-member-name"]}>{member.username}</span>
                        <span className={styles["manage-member-email"]}>{member.email}</span>
                      </div>
                    </label>
                  ))}
              </div>
            </div>

            <div className={styles["modal-footer"]} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
                Đã chọn: {selectedMemberIds.length} thành viên mới
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className={styles["btn-secondary"]}
                  onClick={() => setShowManageMembersModal(false)}
                  disabled={manageMembersActionLoading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={styles["btn-primary"]}
                  onClick={handleSaveAddMembers}
                  disabled={manageMembersActionLoading}
                >
                  {manageMembersActionLoading ? "Đang lưu..." : "Thêm thành viên"}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
};

export default LeaderDashboard;
