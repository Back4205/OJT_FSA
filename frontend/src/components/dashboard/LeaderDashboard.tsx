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

// ── Fake weekly completion data for chart (W1..W8) ────────────────────────
const CHART_POINTS = [28, 38, 42, 52, 50, 62, 70, 80, 88, 92];
const buildLinePath = (points: number[], w: number, h: number) => {
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(p => h - (p / 100) * h);
  return xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
};

// ── Component ──────────────────────────────────────────────────────────────
type ActiveTab = "dashboard" | "projects" | "project_detail" | "task_detail" | "members" | "profile";

const LeaderDashboard: React.FC = () => {
  const { user, logout, checkAuth } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [projectViewMode, setProjectViewMode] = useState<"list" | "board">("list");
  const [listCurrentPage, setListCurrentPage] = useState<number>(1);

  // Data
  const [projects, setProjects]   = useState<ProjectResponse[]>([]);
  const [wsMembers, setWsMembers] = useState<WorkspaceMemberShort[]>([]);
  const [allTasks, setAllTasks]   = useState<TaskResponse[]>([]);
  const [userWs, setUserWs]       = useState<UserWorkspaceResponse[]>([]);

  // UI state
  const [loading, setLoading]     = useState(true);
  const [errorMsg, setErrorMsg]   = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [wsDdOpen, setWsDdOpen]   = useState(false);
  const [userDdOpen, setUserDdOpen] = useState(false);

  // Modals
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask]       = useState(false);
  const [showInvite, setShowInvite]               = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);

  // Forms
  const [projName, setProjName]   = useState("");
  const [projDesc, setProjDesc]   = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc]   = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskProject, setTaskProject]   = useState<number>(0);
  const [taskAssignee, setTaskAssignee] = useState<number>(0);
  const [inviteEmail, setInviteEmail]   = useState("");
  const [projectMemberToAdd, setProjectMemberToAdd] = useState<number>(0);
  const [projectMemberActionLoading, setProjectMemberActionLoading] = useState(false);

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
      const [projs, mems, wsData] = await Promise.all([
        leaderService.getProjects(),
        leaderService.getWorkspaceMembers().catch(() => []), // Catch 403 for MEMBER
        leaderService.getUserWorkspaces(),
      ]);
      console.log("[LeaderDashboard] Projects loaded:", projs);
      console.log("[LeaderDashboard] Members loaded:", mems);
      setProjects(projs);
      setWsMembers(mems);
      setUserWs(wsData);

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

  useEffect(() => {
    setProjectMemberToAdd(0);
  }, [selectedProjectId]);

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

  const handleAddMemberToProject = async (projectId: number) => {
    if (!projectMemberToAdd) {
      setErrorMsg("Vui lòng chọn member để thêm vào project.");
      return;
    }

    if (projectMemberActionLoading) {
      return;
    }

    setProjectMemberActionLoading(true);
    setErrorMsg("");
    try {
      await leaderService.addProjectMember(projectId, projectMemberToAdd);
      setSuccessMsg("Đã thêm member vào project.");
      setProjectMemberToAdd(0);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể thêm member vào project.");
    } finally {
      setProjectMemberActionLoading(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const todoTasks    = allTasks.filter(t => t.status === "TODO" || t.status === "IN_PROGRESS");
  const doneTasks    = allTasks.filter(t => t.status === "DONE");

  // ── Render helpers ────────────────────────────────────────────────────────
  const currentWsName = user?.workspaceName || "Workspace";

  const renderLineChart = () => {
    const w = 300, h = 120;
    const path = buildLinePath(CHART_POINTS, w, h);
    const weekLabels = ["W1","W2","W3","W4","W5","W6","W7","W8"];
    return (
      <div className={styles["line-chart-container"]}>
        <svg viewBox={`0 0 ${w} ${h}`} className={styles["chart-svg"]} preserveAspectRatio="none">
          {/* grid lines */}
          {[0,25,50,75,100].map(v => (
            <line key={v} x1="0" y1={h - (v/100)*h} x2={w} y2={h - (v/100)*h}
              stroke="#f1f5f9" strokeWidth="1" />
          ))}
          {/* area */}
          <defs>
            <linearGradient id="ld-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={`${path} L ${w},${h} L 0,${h} Z`} fill="url(#ld-grad)" />
          <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {CHART_POINTS.map((p, i) => {
            const x = (i / (CHART_POINTS.length - 1)) * w;
            const y = h - (p / 100) * h;
            return <circle key={i} cx={x} cy={y} r="4" fill="#6366f1" stroke="#fff" strokeWidth="2" />;
          })}
        </svg>
        <div className={styles["axis-x"]}>
          {weekLabels.map(l => <span key={l}>{l}</span>)}
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
                {user?.role === "MEMBER" ? "Member" : "Leader"} · Team
              </span>
            </div>
            <i className={`bi bi-chevron-down ${styles["chevron-icon"]} ${wsDdOpen ? styles["open"] : ""}`}></i>
          </button>

          {wsDdOpen && (
            <div className={styles["workspace-dropdown"]}>
              <p className={styles["dropdown-section-title"]}>Your Workspaces</p>
              {userWs.map((ws, i) => (
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
                      {ws.roleName === "WORKSPACE_ADMIN" ? "Admin" : ws.roleName} · Team
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
              { key: "dashboard", icon: "bi-grid-fill",        label: "Dashboard"    },
              { key: "projects",  icon: "bi-folder-fill",       label: "My projects"  },
              ...(user?.role !== "MEMBER" ? [{ key: "members", icon: "bi-people-fill", label: "Members" }] : []),
              { key: "profile",   icon: "bi-person-fill",        label: "Profile"      },
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
                  <h1 className={styles["page-title"]}>Leader dashboard</h1>
                  <p className={styles["page-sub"]}>Welcome back — here's what's happening today.</p>
                </div>
                <div className={styles["header-actions"]}>
                  <button className={styles["btn-outline"]}>
                    <i className="bi bi-person" /> Leader
                  </button>
                  <button className={styles["btn-primary"]} onClick={() => setShowCreateTask(true)}>
                    <i className="bi bi-plus-lg" /> Assign task
                  </button>
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
                  {wsMembers.filter(m => m.active).slice(0, 5).map((m, i) => {
                    const memberTasks = allTasks.filter(t => t.assigneeId === m.userId);
                    const done = memberTasks.filter(t => t.status === "DONE").length;
                    const pct = memberTasks.length > 0 ? Math.round((done / memberTasks.length) * 100) : 0;
                    return (
                      <div key={m.id} className={styles["member-row"]}>
                        <div className={`${styles["member-avatar"]} ${styles[avatarColor(i)]}`}>
                          {getInitials(m.username)}
                        </div>
                        <div className={styles["member-info"]}>
                          <div className={styles["member-name"]}>{m.username}</div>
                          <div className={styles["member-role"]}>{m.roleName === "LEADER" ? "Leader" : m.email.split("@")[0]}</div>
                        </div>
                        <div className={styles["member-pct"]}>
                          <div className={styles["mini-bar"]}>
                            <div className={styles["mini-bar-fill"]} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={styles["member-pct-text"]}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
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

              {/* Bottom row: My tasks + Task completion + Deadlines + Activities */}
              <div className={styles["dash-bottom"]}>
                {/* My tasks */}
                <div className={styles["card"]}>
                  <div className={styles["card-header"]}>
                    <h2 className={styles["card-title"]}>My tasks</h2>
                    <span className={styles["card-badge"]}>{todoTasks.length} pending</span>
                  </div>
                  {todoTasks.slice(0, 6).map(t => (
                    <div key={t.id} className={styles["task-row"]}>
                      <div className={`${styles["task-checkbox"]} ${t.status === "DONE" ? styles["done"] : ""}`}>
                        {t.status === "DONE" && <i className="bi bi-check" style={{ color: "#fff", fontSize: "0.65rem" }} />}
                      </div>
                      <div className={styles["task-info"]}>
                        <div className={styles["task-title"]}>{t.title}</div>
                        <div className={styles["task-due"]}>
                          {t.deadline ? formatDue(t.deadline) : t.status.replace("_", " ")}
                        </div>
                      </div>
                      <span className={`${styles["priority-badge"]} ${styles[t.priority]}`}>{t.priority}</span>
                    </div>
                  ))}
                  {todoTasks.length === 0 && (
                    <div className={styles["empty-state"]}>
                      <i className={`bi bi-check2-all ${styles["empty-icon"]}`} />
                      <p className={styles["empty-title"]}>All clear!</p>
                      <p className={styles["empty-sub"]}>No pending tasks</p>
                    </div>
                  )}
                </div>

                {/* Task completion chart */}
                <div className={styles["card"]}>
                  <div className={styles["card-header"]}>
                    <h2 className={styles["card-title"]}>Task completion</h2>
                    <span className={styles["chart-badge"]}>
                      +{doneTasks.length > 0 ? Math.round((doneTasks.length / Math.max(allTasks.length, 1)) * 100) : 18}% vs. last cycle
                    </span>
                  </div>
                  {renderLineChart()}
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
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{p.members.length} members · {p.taskCount} tasks</div>
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
            const projectTasks = allTasks.filter(t => t.projectId === selectedProjectId);
            
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
                    <span className={styles["card-badge"]}>{project.members.length} members</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                    {project.members.map((member) => (
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
                          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{member.username}</span>
                          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{member.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "12px", alignItems: "end", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 280px" }}>
                      <label className={styles["form-label"]}>Add workspace member to this project</label>
                      <select
                        className={styles["form-select"]}
                        value={projectMemberToAdd}
                        onChange={(e) => setProjectMemberToAdd(Number(e.target.value))}
                      >
                        <option value={0}>-- Select member --</option>
                        {wsMembers
                          .filter((member) => member.active && !project.members.some((projectMember) => projectMember.id === member.userId))
                          .map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.username} - {member.email}
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className={styles["btn-primary"]}
                      onClick={() => void handleAddMemberToProject(project.id)}
                      disabled={projectMemberActionLoading || !projectMemberToAdd}
                    >
                      {projectMemberActionLoading ? "Adding..." : "Add member"}
                    </button>
                  </div>
                </div>

                <div className={styles["view-toggle"]}>
                  <button className={`${styles["view-btn"]} ${projectViewMode === "list" ? styles["active"] : ""}`} onClick={() => setProjectViewMode("list")}>
                    <i className="bi bi-list-task" /> List
                  </button>
                  <button className={`${styles["view-btn"]} ${projectViewMode === "board" ? styles["active"] : ""}`} onClick={() => setProjectViewMode("board")}>
                    <i className="bi bi-kanban" /> Board
                  </button>
                </div>

                {projectViewMode === "list" && (
                  <div className={styles["card"]} style={{ padding: "0" }}>
                    <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "16px" }}>
                       <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Filters</span>
                    </div>
                    <table className={styles["task-table"]}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Task</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Assignee</th>
                          <th>Due</th>
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
                      <div key={s} className={styles["card"]} style={{ background: "#f8fafc" }}>
                        <div className={styles["card-header"]}>
                          <span className={styles["card-title"]} style={{ fontSize: "0.82rem" }}>
                            {s.replace("_", " ")}
                          </span>
                          <span className={styles["card-badge"]}>{projectTasks.filter(t => t.status === s).length}</span>
                        </div>
                        {projectTasks.filter(t => t.status === s).map(t => (
                          <div key={t.id} onClick={() => { setSelectedTaskId(t.id); setActiveTab("task_detail"); }} style={{ background: "#fff", borderRadius: "8px", padding: "12px", marginBottom: "8px", border: "1px solid #e2e8f0", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                            <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: "8px" }}>{t.title}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span className={`${styles["priority-badge"]} ${styles[t.priority]}`}>{t.priority}</span>
                              {t.deadline && <span style={{ fontSize: "0.68rem", color: isOverdue(t.deadline) ? "#ef4444" : "#64748b" }}>{formatDue(t.deadline)}</span>}
                            </div>
                          </div>
                        ))}
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
                     <button className={styles["btn-outline"]}><i className="bi bi-link-45deg"/> Copy link</button>
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
                  </div>

                  <div className={styles["task-detail-sidebar"]}>
                     <div className={styles["card"]}>
                        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>Properties</h3>
                        
                        <div className={styles["property-row"]}>
                           <div className={styles["property-label"]}><i className="bi bi-flag"/> Status</div>
                           <div className={styles["property-value"]}><span className={`${styles["status-badge"]} ${styles[task.status]}`}>{task.status.replace("_", " ")}</span></div>
                        </div>
                        
                        <div className={styles["property-row"]}>
                           <div className={styles["property-label"]}><i className="bi bi-exclamation-triangle"/> Priority</div>
                           <div className={styles["property-value"]}><span className={`${styles["priority-badge"]} ${styles[task.priority]}`}>{task.priority}</span></div>
                        </div>

                        <div className={styles["property-row"]}>
                           <div className={styles["property-label"]}><i className="bi bi-person"/> Assignee</div>
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
                           <div className={styles["property-label"]}><i className="bi bi-calendar-event"/> Deadline</div>
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

    </div>
  );
};

export default LeaderDashboard;
