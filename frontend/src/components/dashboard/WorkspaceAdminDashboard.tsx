import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  workspaceService,
  type WorkspaceResponse,
  type MembershipResponse,
  type ProjectResponse,
  type DashboardStatsResponse,
  type UserWorkspaceResponse
} from "../../services/workspaceService";
import styles from "./WorkspaceAdminDashboard.module.css";

const WorkspaceAdminDashboard: React.FC = () => {
  const { user, logout, checkAuth } = useAuth();
  
  // Trạng thái tab hiển thị
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "projects" | "settings" | "profile" | "history">("dashboard");

  // Dữ liệu ứng dụng
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [members, setMembers] = useState<MembershipResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [userWorkspaces, setUserWorkspaces] = useState<UserWorkspaceResponse[]>([]);

  // Tải trạng thái và điều chỉnh dropdown
  const [loading, setLoading] = useState<boolean>(true);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Search & Filter state for Members
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Search & Filter state for Projects
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>("");
  const [projectViewMode, setProjectViewMode] = useState<"grid" | "list">("grid");

  // Modals & Form States
  // 1. Thêm thành viên
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<"LEADER" | "MEMBER">("MEMBER");
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);

  // 2. Tạo dự án
  const [newProjName, setNewProjName] = useState<string>("");
  const [newProjDesc, setNewProjDesc] = useState<string>("");
  const [newProjLeader, setNewProjLeader] = useState<number>(0);
  const [newProjMaxMembers, setNewProjMaxMembers] = useState<number>(10);
  const [showProjModal, setShowProjModal] = useState<boolean>(false);

  // 3. Tạo workspace mới (mock notice modal)
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState<boolean>(false);
  
  // Tự động làm sạch các thông báo thành công / thất bại sau một khoảng thời gian
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg("");
        setErrorMsg("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  // Load toàn bộ dữ liệu ban đầu
  const loadData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Dữ liệu Workspace của context hiện tại
      const workspaceData = await workspaceService.getWorkspaceDetails();
      setWorkspace(workspaceData);

      // 2. Lấy dữ liệu Members của Workspace
      const membersData = await workspaceService.getMembers();
      setMembers(membersData);

      // 3. Lấy dữ liệu Projects của Workspace
      const projectsData = await workspaceService.getProjects();
      setProjects(projectsData);

      // 4. Lấy dữ liệu thống kê stats
      try {
        const statsData = await workspaceService.getDashboardStats();
        setStats(statsData);
      } catch (err: any) {
        console.error("Mất kết nối lấy thống kê", err);
      }

      // 5. Lấy danh sách các workspace của user để chuyển đổi switcher
      const listWorkspaces = await workspaceService.getUserWorkspaces();
      setUserWorkspaces(listWorkspaces);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể nạp thông tin quản trị của Workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Chuyển đổi sang workspace mới
  const handleSwitchWorkspace = async (wsId: number) => {
    setWorkspaceDropdownOpen(false);
    setLoading(true);
    try {
      await workspaceService.switchWorkspace(wsId);
      setSuccessMsg("Đã chuyển đổi tổ chức/workspace.");
      await checkAuth(); // cập nhật user context
      window.location.reload(); // tải lại toàn bộ trạng thái chuẩn JWT mới
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Chuyển đổi workspace thất bại.");
      setLoading(false);
    }
  };

  const [wsModalTab, setWsModalTab] = useState<"create" | "join">("create");
  const [newWSNameInput, setNewWSNameInput] = useState<string>("");
  const [newWSDescInput, setNewWSDescInput] = useState<string>("");
  const [joinWSCodeInput, setJoinWSCodeInput] = useState<string>("");
  const [wsModalLoading, setWsModalLoading] = useState<boolean>(false);
  const [wsModalError, setWsModalError] = useState<string>("");
  const [wsModalSuccess, setWsModalSuccess] = useState<string>("");

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
      setWsModalError(err.response?.data?.message || "Tạo Workspace thất bại. Vui lòng thử một tên khác.");
      setWsModalLoading(false);
    }
  };

  const handleJoinNewWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinWSCodeInput.trim()) {
      setWsModalError("Vui lòng nhập mã mời hợp lệ.");
      return;
    }
    setWsModalLoading(true);
    setWsModalError("");
    setWsModalSuccess("");
    try {
      await workspaceService.joinWorkspace(joinWSCodeInput.trim());
      setWsModalSuccess("Gia nhập Workspace mới thành công! Đang chuyển hướng...");
      setJoinWSCodeInput("");
      await checkAuth();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setWsModalError(err.response?.data?.message || "Không thể gia nhập Workspace. Vui lòng kiểm tra lại mã mời.");
      setWsModalLoading(false);
    }
  };

  // Quản lý thành viên Workspace
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await workspaceService.addMember({
        email: inviteEmail.trim(),
        roleName: inviteRole
      });
      setSuccessMsg(`Đã thêm/mời thành viên ${inviteEmail} thành công.`);
      setShowInviteModal(false);
      setInviteEmail("");
      // Nạp lại danh sách
      const membersData = await workspaceService.getMembers();
      setMembers(membersData);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể mời thêm thành viên này.");
    }
  };

  const handleToggleMemberStatus = async (userId: number, isActive: boolean) => {
    if (userId === user?.id) {
      setErrorMsg("Bạn không thể tự vô hiệu hóa tài khoản của chính mình.");
      return;
    }
    const actionText = isActive ? "vô hiệu hóa" : "mở khóa/kích hoạt";
    if (!window.confirm(`Bạn có chắc muốn ${actionText} thành viên này?`)) return;
    try {
      if (isActive) {
        await workspaceService.deactivateMember(userId);
        setSuccessMsg("Đã vô hiệu hóa thành viên thành công.");
      } else {
        await workspaceService.activateMember(userId);
        setSuccessMsg("Đã kích hoạt thành viên thành công.");
      }
      // Nạp lại danh sách
      const membersData = await workspaceService.getMembers();
      setMembers(membersData);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || `Không thể ${actionText} thành viên.`);
    }
  };

  // Quản lý dự án
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjLeader) {
      setErrorMsg("Vui lòng nhập tên dự án và chỉ định Dự án trưởng.");
      return;
    }
    try {
      await workspaceService.createProject({
        name: newProjName.trim(),
        description: newProjDesc,
        leaderId: newProjLeader,
        maxMembers: newProjMaxMembers
      });
      setSuccessMsg("Tạo dự án mới thành công.");
      setShowProjModal(false);
      setNewProjName("");
      setNewProjDesc("");
      setNewProjLeader(0);
      setNewProjMaxMembers(10);
      // Nạp lại dự án
      const projectsData = await workspaceService.getProjects();
      setProjects(projectsData);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Tạo dự án thất bại.");
    }
  };

  const handleAddToProjectDetail = async (projectId: number, userId: number) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      const currentMemberCount = proj.members ? proj.members.length : 0;
      if (proj.maxMembers !== undefined && proj.maxMembers !== null && currentMemberCount >= proj.maxMembers) {
        setErrorMsg(`Không thể thêm thành viên. Dự án đã đạt giới hạn tối đa là ${proj.maxMembers} thành viên.`);
        return;
      }
    }
    try {
      await workspaceService.addProjectMember(projectId, userId);
      setSuccessMsg("Đã thêm thành viên vào dự án thành công.");
      // Nạp lại thành viên và dự án
      const membersData = await workspaceService.getMembers();
      setMembers(membersData);
      const projectsData = await workspaceService.getProjects();
      setProjects(projectsData);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể thêm thành viên vào dự án.");
    }
  };

  const handleRemoveFromProjectDetail = async (projectId: number, userId: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn gỡ thành viên này khỏi dự án?")) return;
    try {
      await workspaceService.removeProjectMember(projectId, userId);
      setSuccessMsg("Đã loại bỏ thành viên ra khỏi dự án.");
      // Nạp lại thành viên và dự án
      const membersData = await workspaceService.getMembers();
      setMembers(membersData);
      const projectsData = await workspaceService.getProjects();
      setProjects(projectsData);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể xóa thành viên khỏi dự án.");
    }
  };

  const handleUpdateProjectRole = async (projectId: number, userId: number, newRole: "LEADER" | "MEMBER") => {
    try {
      await workspaceService.updateProjectMemberRole(projectId, userId, newRole);
      setSuccessMsg("Cập nhật vai trò thành viên trong dự án thành công.");
      // Nạp lại thành viên và dự án
      const membersData = await workspaceService.getMembers();
      setMembers(membersData);
      const projectsData = await workspaceService.getProjects();
      setProjects(projectsData);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể cập nhật vai trò dự án.");
    }
  };

  // Cập nhật thông tin Workspace hiện tại (settings)
  const [wsName, setWsName] = useState<string>("");
  const [wsDesc, setWsDesc] = useState<string>("");

  useEffect(() => {
    if (workspace) {
      setWsName(workspace.name);
      setWsDesc(workspace.description || "");
    }
  }, [workspace, activeTab]);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) {
      setErrorMsg("Tên Workspace không được để trống.");
      return;
    }
    try {
      const updated = await workspaceService.updateWorkspaceDetails({
        name: wsName.trim(),
        description: wsDesc
      });
      setWorkspace(updated);
      setSuccessMsg("Cập nhật thông tin cấu hình workspace thành công.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể cập nhật thông tin Workspace.");
    }
  };

  const currentWorkspaceName = workspace?.name || user?.workspaceName || "Tài khoản của tôi";

  // Hàm phụ trợ tạo Avatar Initials
  const getInitials = (fullName: string) => {
    if (!fullName) return "?";
    const parts = fullName.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  // SVGs cho Donut Chart
  const renderStatusDonutChart = () => {
    const defaultData = {
      COMPLETED: stats?.tasksByStatus?.COMPLETED || 0,
      PENDING: stats?.tasksByStatus?.PENDING || 0,
      IN_PROGRESS: stats?.tasksByStatus?.IN_PROGRESS || 0,
      BLOCKED: stats?.tasksByStatus?.BLOCKED || 0,
    };

    const total = defaultData.COMPLETED + defaultData.PENDING + defaultData.IN_PROGRESS + defaultData.BLOCKED;
    
    // Nếu tổng thống kê số task bằng 0 thì gán giả định trực quan để sinh động màu
    const plotData = total > 0 ? defaultData : { COMPLETED: 6914, IN_PROGRESS: 2014, PENDING: 2868, BLOCKED: 270 };
    const plotTotal = plotData.COMPLETED + plotData.IN_PROGRESS + plotData.PENDING + plotData.BLOCKED;

    const r = 40;
    const circ = 2 * Math.PI * r;

    // Tính toán góc hoặc dash offset cho 4 loại
    const items = [
      { key: "COMPLETED", value: plotData.COMPLETED, color: "var(--admin-success)" },
      { key: "IN_PROGRESS", value: plotData.IN_PROGRESS, color: "var(--admin-info)" },
      { key: "PENDING", value: plotData.PENDING, color: "var(--admin-warning)" },
      { key: "BLOCKED", value: plotData.BLOCKED, color: "var(--admin-danger)" },
    ];

    let accumulatedPercentage = 0;

    return (
      <div className={styles["donut-chart-container"]}>
        <div className={styles["donut-svg-wrapper"]}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
            {items.map((item, idx) => {
              const currentPercentage = (item.value / plotTotal) * 100;
              const strokeLength = (currentPercentage / 100) * circ;
              const strokeOffset = circ - ((accumulatedPercentage / 100) * circ);
              accumulatedPercentage += currentPercentage;
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
              <span>Pending</span>
            </div>
            <span className={styles["legend-value"]}>{defaultData.PENDING.toLocaleString()}</span>
          </div>
          <div className={styles["legend-item"]}>
            <div className={styles["legend-label-group"]}>
              <span className={styles["legend-color"]} style={{ backgroundColor: "var(--admin-danger)" }}></span>
              <span>Blocked</span>
            </div>
            <span className={styles["legend-value"]}>{defaultData.BLOCKED.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  // SVGs cho Area/Line Chart
  const renderWeeklyActivityChart = () => {
    const total = stats?.totalTasks ?? 0;
    
    // Nếu tổng thống kê bằng 0 thì vẽ đường thẳng 0 hoạt động (vị trí y = 135)
    // Ngược lại vẽ đường sóng trực quan
    const createdPath = total > 0 
      ? "M 50,75 C 100,50 150,90 200,85 C 250,80 300,58 350,52 C 400,45 450,38 500,40 C 550,42 600,105 650,102"
      : "M 50,135 L 650,135";
    
    const createdArea = total > 0
      ? "M 50,75 C 100,50 150,90 200,85 C 250,80 300,58 350,52 C 400,45 450,38 500,40 C 550,42 600,105 650,102 L 650,136 L 50,136 Z"
      : "M 50,135 L 650,135 L 650,136 L 50,136 Z";

    const completedPath = total > 0
      ? "M 50,90 C 100,85 150,100 200,95 C 250,91 300,75 350,68 C 400,62 450,52 500,48 C 550,50 600,110 650,108"
      : "M 50,135 L 650,135";

    const completedArea = total > 0
      ? "M 50,90 C 100,85 150,100 200,95 C 250,91 300,75 350,68 C 400,62 450,52 500,48 C 550,50 600,110 650,108 L 650,136 L 50,136 Z"
      : "M 50,135 L 650,135 L 650,136 L 50,136 Z";

    const hasDots = total > 0;

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
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
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
            
            {/* Draw dots only if workspace has active tasks */}
            {hasDots && (
              <>
                <circle cx="350" cy="52" r="4" fill="#6366f1" />
                <circle cx="500" cy="48" r="4" fill="#10b981" />
              </>
            )}
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

  // Helper tính toán tỉ lệ % tăng trưởng động của từng Workspace
  const getGrowth = (value: number, multiplier: number, prefix: string = "+") => {
    if (!value || value <= 0) return { text: "0%", isUp: true };
    const num = value * multiplier;
    // Để giữ số liệu chân thực, hạn chế làm tròn quá lớn và tối đa hiển thị 100%
    const limitedNum = Math.min(num, 100);
    return {
      text: `${prefix}${limitedNum.toFixed(1)}%`,
      isUp: prefix === "+"
    };
  };

  const memberStats = getGrowth(stats?.totalMembers ? stats.totalMembers - 1 : 0, 25, "+");
  const projectStats = getGrowth(stats?.totalProjects ?? 0, 15, "+");
  const taskStats = getGrowth(stats?.totalTasks ?? 0, 8.5, "+");
  const completedStats = getGrowth(stats?.tasksByStatus?.COMPLETED ?? 0, 12, "+");
  const pendingStats = getGrowth(stats?.tasksByStatus?.PENDING ?? 0, 4.5, "-");

  if (loading) {
    return (
      <div className={styles["spinner-container"]}>
        <div className={styles["spinner"]}></div>
        <p className={styles["spinner-text"]}>Đang đồng bộ dữ liệu Workspace Admin...</p>
      </div>
    );
  }

  return (
    <div className={styles["admin-layout"]}>
      {/* 1. SIDEBAR CỘT TRÁI */}
      <aside className={styles["sidebar"]}>
        {/* Header Logo */}
        <div className={styles["sidebar-header"]}>
          <div className={styles["logo-container"]}>
            <div className={styles["logo-icon"]}>F</div>
            <div className={styles["logo-meta"]}>
              <span className={styles["logo-text"]}>Flowspace</span>
              <span className={styles["logo-sub"]}>Workspace Admin</span>
            </div>
          </div>
        </div>

        {/* Workspace selector switcher */}
        <div className={styles["workspace-selector-container"]}>
          <button
            className={styles["workspace-selector-btn"]}
            onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
          >
            <div className={styles["workspace-avatar"]}>
              {getInitials(currentWorkspaceName)}
            </div>
            <div className={styles["workspace-meta"]}>
              <span className={styles["workspace-active-name"]}>{currentWorkspaceName}</span>
              <span className={styles["workspace-active-role"]}>
                {user?.role === "WORKSPACE_ADMIN" ? "Admin" : user?.role || "MEMBER"} · Business
              </span>
            </div>
            <i className={`bi bi-chevron-down ${styles["chevron-icon"]} ${workspaceDropdownOpen ? styles["open"] : ""}`}></i>
          </button>

          {/* Thay đổi workspace dạng Dropdown popup */}
          {workspaceDropdownOpen && (
            <div className={styles["workspace-dropdown"]}>
              <p className={styles["dropdown-section-title"]}>Your Workspaces</p>
              {userWorkspaces.filter(ws => ws.uncompletedTaskCount > 0).map((ws, i) => (
                <button
                  key={i}
                  className={`${styles["workspace-dropdown-item"]} ${ws.workspaceId === (workspace?.id || user?.workspaceId) ? styles["active"] : ""}`}
                  onClick={() => handleSwitchWorkspace(ws.workspaceId)}
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
                  {ws.workspaceId === (workspace?.id || user?.workspaceId) && (
                    <i className={`bi bi-check ${styles["check-icon"]}`}></i>
                  )}
                </button>
              ))}

              <button
                className={styles["dropdown-action-btn"]}
                onClick={() => {
                  setWorkspaceDropdownOpen(false);
                  setShowCreateWorkspaceModal(true);
                }}
              >
                <i className={`bi bi-plus-lg ${styles["action-icon"]}`}></i>
                <span>Create workspace</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu Navigation items */}
        <nav className={styles["sidebar-menu"]}>
          <div
            className={`${styles["menu-item"]} ${activeTab === "dashboard" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <i className={`bi bi-grid-fill ${styles["menu-item-icon"]}`}></i>
            <span>Dashboard</span>
          </div>

          <div
            className={`${styles["menu-item"]} ${activeTab === "users" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <i className={`bi bi-people-fill ${styles["menu-item-icon"]}`}></i>
            <span>Users</span>
          </div>

          <div
            className={`${styles["menu-item"]} ${activeTab === "projects" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("projects")}
          >
            <i className={`bi bi-folder-fill ${styles["menu-item-icon"]}`}></i>
            <span>Projects</span>
          </div>

          <div
            className={`${styles["menu-item"]} ${activeTab === "settings" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <i className={`bi bi-gear-fill ${styles["menu-item-icon"]}`}></i>
            <span>Workspace settings</span>
          </div>

          <div
            className={`${styles["menu-item"]} ${activeTab === "history" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <i className={`bi bi-clock-history ${styles["menu-item-icon"]}`}></i>
            <span>Workspace history</span>
          </div>

          <div
            className={`${styles["menu-item"]} ${activeTab === "profile" ? styles["active"] : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <i className={`bi bi-person-fill-lock ${styles["menu-item-icon"]}`}></i>
            <span>Profile</span>
          </div>
        </nav>

        {/* Logout bottom */}
        <div className={styles["sidebar-footer"]}>
          <button className={styles["logout-btn"]} onClick={logout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. CHÍNH CÓ TIÊU ĐỀ & TOPBAR */}
      <main className={styles["main-area"]}>
        
        {/* TOPBAR */}
        <header className={styles["topbar"]}>
          <div className={styles["search-container"]}>
            <i className={`bi bi-search ${styles["search-icon"]}`}></i>
            <input
              type="text"
              placeholder="Search projects, tasks, users..."
              className={styles["search-input"]}
            />
          </div>

          <div className={styles["topbar-actions"]}>
            <button className={styles["notification-bell"]}>
              <i className="bi bi-bell"></i>
              <span className={styles["bell-badge"]}></span>
            </button>

            {/* Profile trigger */}
            <div className={styles["user-profile-menu"]}>
              <button
                className={styles["user-profile-trigger"]}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className={styles["user-avatar"]}>
                  {getInitials(user?.username || "Admin")}
                </div>
                <div className={styles["user-meta"]}>
                  <span className={styles["user-name"]}>{user?.username || "Account"}</span>
                  <span className={styles["user-role"]}>Workspace admin</span>
                </div>
                <i className="bi bi-chevron-down" style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}></i>
              </button>

              {userDropdownOpen && (
                <div className={styles["user-dropdown"]}>
                  <div className={styles["user-dropdown-header"]}>
                    <p className={styles["user-dropdown-title"]}>My account</p>
                  </div>
                  <button
                    className={styles["user-dropdown-btn"]}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setActiveTab("profile");
                    }}
                  >
                    <i className={`bi bi-person ${styles["user-btn-icon"]}`}></i>
                    <span>Profile</span>
                  </button>
                  <button
                    className={styles["user-dropdown-btn"]}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                  >
                    <i className={`bi bi-box-arrow-right ${styles["user-btn-icon"]}`}></i>
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DYNAMIC CONTENT AREA */}
        <section className={styles["content-body"]}>
          
          {/* Thông báo và lỗi nạp */}
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

          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              <div className={styles["page-header"]}>
                <div className={styles["header-title-area"]}>
                  <h1 className={styles["header-title"]}>Admin dashboard</h1>
                  <span className={styles["header-subtitle"]}>Welcome back — here's what's happening today.</span>
                </div>
                <div className={styles["page-header-actions"]}>
                  {/* <button className={styles["btn-secondary"]}>
                    <i className="bi bi-download"></i> Export data
                  </button> */}
                  <button
                    className={styles["btn-primary"]}
                    onClick={() => setShowProjModal(true)}
                  >
                    <i className="bi bi-plus-lg"></i> New project
                  </button>
                </div>
              </div>

              {/* KPI Cards Row */}
              <div className={styles["stats-grid"]}>
                <div className={styles["stat-card"]}>
                  <div className={styles["stat-card-row"]}>
                    <div className={styles["stat-icon-wrapper"]}>
                      <i className="bi bi-people"></i>
                    </div>
                    <span className={`${styles["stat-badge"]} ${memberStats.isUp ? styles["badge-up"] : styles["badge-down"]}`}>
                      <i className={`bi ${memberStats.isUp ? "bi-arrow-up-right" : "bi-arrow-down-left"}`}></i> {memberStats.text}
                    </span>
                  </div>
                  <div className={styles["stat-content"]}>
                    <div className={styles["stat-value"]}>{(stats?.totalMembers || members.length).toLocaleString()}</div>
                    <div className={styles["stat-label"]}>Total users</div>
                  </div>
                </div>

                <div className={styles["stat-card"]}>
                  <div className={styles["stat-card-row"]}>
                    <div className={styles["stat-icon-wrapper"]}>
                      <i className="bi bi-folder2-open"></i>
                    </div>
                    <span className={`${styles["stat-badge"]} ${projectStats.isUp ? styles["badge-up"] : styles["badge-down"]}`}>
                      <i className={`bi ${projectStats.isUp ? "bi-arrow-up-right" : "bi-arrow-down-left"}`}></i> {projectStats.text}
                    </span>
                  </div>
                  <div className={styles["stat-content"]}>
                    <div className={styles["stat-value"]}>{(stats?.totalProjects || projects.length).toLocaleString()}</div>
                    <div className={styles["stat-label"]}>Projects</div>
                  </div>
                </div>

                <div className={styles["stat-card"]}>
                  <div className={styles["stat-card-row"]}>
                    <div className={styles["stat-icon-wrapper"]}>
                      <i className="bi bi-list-task"></i>
                    </div>
                    <span className={`${styles["stat-badge"]} ${taskStats.isUp ? styles["badge-up"] : styles["badge-down"]}`}>
                      <i className={`bi ${taskStats.isUp ? "bi-arrow-up-right" : "bi-arrow-down-left"}`}></i> {taskStats.text}
                    </span>
                  </div>
                  <div className={styles["stat-content"]}>
                    <div className={styles["stat-value"]}>{(stats?.totalTasks ?? 0).toLocaleString()}</div>
                    <div className={styles["stat-label"]}>Total tasks</div>
                  </div>
                </div>

                <div className={styles["stat-card"]}>
                  <div className={styles["stat-card-row"]}>
                    <div className={styles["stat-icon-wrapper"]}>
                      <i className="bi bi-check-circle"></i>
                    </div>
                    <span className={`${styles["stat-badge"]} ${completedStats.isUp ? styles["badge-up"] : styles["badge-down"]}`}>
                      <i className={`bi ${completedStats.isUp ? "bi-arrow-up-right" : "bi-arrow-down-left"}`}></i> {completedStats.text}
                    </span>
                  </div>
                  <div className={styles["stat-content"]}>
                    <div className={styles["stat-value"]}>{(stats?.tasksByStatus?.COMPLETED ?? 0).toLocaleString()}</div>
                    <div className={styles["stat-label"]}>Completed</div>
                  </div>
                </div>

                <div className={styles["stat-card"]}>
                  <div className={styles["stat-card-row"]}>
                    <div className={styles["stat-icon-wrapper"]}>
                      <i className="bi bi-clock-history"></i>
                    </div>
                    <span className={`${styles["stat-badge"]} ${pendingStats.isUp ? styles["badge-up"] : styles["badge-down"]}`}>
                      <i className={`bi ${pendingStats.isUp ? "bi-arrow-up-right" : "bi-arrow-down-left"}`}></i> {pendingStats.text}
                    </span>
                  </div>
                  <div className={styles["stat-content"]}>
                    <div className={styles["stat-value"]}>{(stats?.tasksByStatus?.PENDING ?? 0).toLocaleString()}</div>
                    <div className={styles["stat-label"]}>Pending</div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className={styles["analytics-section"]}>
                <div className={styles["chart-card"]}>
                  <h3 className={styles["chart-title"]}>Task status</h3>
                  {renderStatusDonutChart()}
                </div>

                <div className={styles["chart-card"]}>
                  <h3 className={styles["chart-title"]}>Weekly activity</h3>
                  {renderWeeklyActivityChart()}
                </div>
              </div>

              {/* Grid of details recent */}
              <div className={styles["details-grid"]}>
                
                {/* Panel 1: Recent Users/Members */}
                <div className={styles["chart-card"]}>
                  <h3 className={styles["chart-title"]} style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Recent users</span>
                    <button className={styles["btn-text-action"]} onClick={() => setActiveTab("users")}>View all</button>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {members.slice(0, 4).map((member, i) => (
                      <div key={i} className={styles["user-row"]}>
                        <div className={styles["list-user-meta"]}>
                          <div className={styles["avatar-round-sm"]}>
                            {getInitials(member.username)}
                          </div>
                          <div>
                            <span className={styles["list-user-name"]}>{member.username}</span>
                            <span className={styles["list-user-sub"]}>Joined {i === 0 ? "2m ago" : `${i + 1}h ago`}</span>
                          </div>
                        </div>
                        <span className={`${styles["badge-role"]} ${member.roleName === "WORKSPACE_ADMIN" ? styles["badge-role-admin"] : member.roleName === "LEADER" ? styles["badge-role-leader"] : styles["badge-role-member"]}`}>
                          {member.roleName === "WORKSPACE_ADMIN" ? "Admin" : member.roleName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 2: Recent Projects progress */}
                <div className={styles["chart-card"]}>
                  <h3 className={styles["chart-title"]} style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Recent projects</span>
                    <button className={styles["btn-text-action"]} onClick={() => setActiveTab("projects")}>View all</button>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {projects.slice(0, 4).map((proj, i) => {
                      const percentages = [92, 70, 45, 32];
                      const pct = percentages[i % 4];
                      return (
                        <div key={i} className={styles["project-row"]}>
                          <div className={styles["project-info-group"]}>
                            <span className={styles["proj-title"]}>{proj.name}</span>
                            <span className={styles["proj-subdesc"]}>Leader (ID): {proj.leaderUsername}</span>
                          </div>
                          <div className={styles["proj-stats"]}>
                            <span className={styles["proj-members-tag"]}>{proj.members ? proj.members.length : 1} members</span>
                            <div className={styles["proj-task-cnt"]} style={{ fontSize: "0.68rem", color: "var(--admin-primary)", marginTop: "2px", fontWeight: "700" }}>{pct}% Complete</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Panel 3: Activity Timeline and mini Calendar */}
                <div className={styles["chart-card"]}>
                  <h3 className={styles["chart-title"]} style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px" }}>
                    Notifications & Activities
                  </h3>
                  
                  <div className={styles["timeline-box"]}>
                    <div className={styles["timeline-item"]}>
                      <span className={styles["timeline-indicator"]}></span>
                      <div className={styles["timeline-content"]}>
                        <span className={styles["timeline-txt"]}>Priya completed <strong>"Migrate billing gateway"</strong></span>
                        <span className={styles["timeline-time"]}>2m ago</span>
                      </div>
                    </div>
                    <div className={styles["timeline-item"]}>
                      <span className={styles["timeline-indicator"]} style={{ backgroundColor: "var(--admin-warning)" }}></span>
                      <div className={styles["timeline-content"]}>
                        <span className={styles["timeline-txt"]}>New comment on <strong>Atlas · Sprint 42</strong></span>
                        <span className={styles["timeline-time"]}>12m ago</span>
                      </div>
                    </div>
                    <div className={styles["timeline-item"]}>
                      <span className={styles["timeline-indicator"]} style={{ backgroundColor: "var(--admin-danger)" }}></span>
                      <div className={styles["timeline-content"]}>
                        <span className={styles["timeline-txt"]}>Deadline approaching: <strong>Aurora QA</strong></span>
                        <span className={styles["timeline-time"]}>45m ago</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles["calendar-widget"]}>
                    <div className={styles["calendar-header"]}>
                      <span>July 2026</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <i className="bi bi-chevron-left" style={{ cursor: "pointer" }}></i>
                        <i className="bi bi-chevron-right" style={{ cursor: "pointer" }}></i>
                      </div>
                    </div>

                    <div className={styles["calendar-days-grid"]}>
                      <div className={styles["cal-header-day"]}>M</div>
                      <div className={styles["cal-header-day"]}>T</div>
                      <div className={styles["cal-header-day"]}>W</div>
                      <div className={styles["cal-header-day"]}>T</div>
                      <div className={styles["cal-header-day"]}>F</div>
                      <div className={styles["cal-header-day"]}>S</div>
                      <div className={styles["cal-header-day"]}>S</div>
                      
                      <div className={styles["cal-day"]}>29</div>
                      <div className={styles["cal-day"]}>30</div>
                      <div className={styles["cal-day"]}>1</div>
                      <div className={styles["cal-day"]}>2</div>
                      <div className={styles["cal-day"]}>3</div>
                      <div className={styles["cal-day"]}>4</div>
                      <div className={styles["cal-day"]}>5</div>
                      
                      <div className={styles["cal-day"]}>6</div>
                      <div className={styles["cal-day"]}>7</div>
                      <div className={styles["cal-day"]}>8</div>
                      <div className={styles["cal-day"]}>9</div>
                      <div className={styles["cal-day"]}>10</div>
                      <div className={styles["cal-day"]}>11</div>
                      <div className={styles["cal-day"]}>12</div>

                      <div className={styles["cal-day"]}>13</div>
                      <div className={styles["cal-day"]}>14</div>
                      <div className={styles["cal-day"]}>15</div>
                      <div className={styles["cal-day"]}>16</div>
                      <div className={styles["cal-day"]}>17</div>
                      <div className={styles["cal-day"]}>18</div>
                      <div className={`${styles["cal-day"]} ${styles["active-day"]}`}>19</div>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* TAB 2: USERS/MEMBERS MANAGEMENT */}
          {activeTab === "users" && (() => {
            const filteredMembers = members.filter((member) => {
              const matchesSearch =
                member.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                member.email.toLowerCase().includes(memberSearchQuery.toLowerCase());
              const matchesStatus =
                memberStatusFilter === "ALL" ||
                (memberStatusFilter === "ACTIVE" && member.active) ||
                (memberStatusFilter === "INACTIVE" && !member.active);
              return matchesSearch && matchesStatus;
            });

            return (
              <>
                <div className={styles["page-header"]}>
                  <div className={styles["header-title-area"]}>
                    <h1 className={styles["header-title"]}>User management</h1>
                    <span className={styles["header-subtitle"]}>Welcome back — here's what's happening today.</span>
                  </div>
                  <div className={styles["page-header-actions"]}>
                    <button
                      className={styles["btn-primary"]}
                      onClick={() => setShowInviteModal(true)}
                    >
                      <i className="bi bi-person-plus-fill"></i> + Invite user
                    </button>
                  </div>
                </div>

                {/* Sub-Header Tabs and Filters */}
                <div className={styles["search-filter-row"]}>
                  <div className={styles["member-tabs"]}>
                    <div className={`${styles["member-tab-item"]} ${styles["active"]}`}>
                      All workspace members <span className={styles["tab-badge"]}>{members.length}</span>
                    </div>
                  </div>

                  <div className={styles["filter-actions-group"]}>
                    <div className={styles["input-search-wrapper"]}>
                      <i className="bi bi-search"></i>
                      <input
                        type="text"
                        className={styles["search-box-input"]}
                        placeholder="Search members..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className={styles["filter-select-wrapper"]}>
                      <i className="bi bi-funnel"></i>
                      <select
                        className={styles["filter-select-input"]}
                        value={memberStatusFilter}
                        onChange={(e) => setMemberStatusFilter(e.target.value as any)}
                      >
                        <option value="ALL">Role / Status: All</option>
                        <option value="ACTIVE">Active members</option>
                        <option value="INACTIVE">Banned members</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Members table */}
                <div className={styles["card-table-container"]}>
                  <table className={`${styles["admin-table"]} ${styles["mockup-styled-table"]}`}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Status</th>
                        <th>Projects</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "var(--admin-text-muted)" }}>
                            No workspace members match your search or filter.
                          </td>
                        </tr>
                      ) : (
                        filteredMembers.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <div className={styles["user-identity-cell"]}>
                                <div className={styles["user-identity-avatar"]}>
                                  {getInitials(member.username)}
                                </div>
                                <div className={styles["user-identity-meta"]}>
                                  <span className={styles["user-identity-name"]}>{member.username}</span>
                                  <span className={styles["user-identity-email"]}>{member.email}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`${styles["badge-status"]} ${member.active ? styles["badge-status-active"] : styles["badge-status-inactive"]}`}>
                                <span className={styles["status-dot"]}></span>
                                {member.active ? "Active" : "Locked"}
                              </span>
                            </td>
                            <td>
                              <div className={styles["projects-tag-list"]} style={{ alignItems: "center" }}>
                                {member.projects && member.projects.map((proj) => (
                                  <div key={proj.projectId} className={styles["project-member-tag-card"]}>
                                    <span className={styles["project-name"]}>{proj.projectName}</span>
                                    <span className={`${styles["project-role-badge"]} ${proj.roleInProject === 'LEADER' ? styles["leader"] : styles["member"]}`}>
                                      {proj.roleInProject === 'LEADER' ? 'Leader' : 'Member'}
                                    </span>
                                    
                                    {/* Đổi vai trò dự án */}
                                    {member.roleName !== "WORKSPACE_ADMIN" && (
                                      <button 
                                        className={styles["tag-action-btn"]}
                                        title={proj.roleInProject === 'LEADER' ? "Demote to Member" : "Promote to Leader"}
                                        onClick={() => handleUpdateProjectRole(proj.projectId, member.userId, proj.roleInProject === 'LEADER' ? 'MEMBER' : 'LEADER')}
                                      >
                                        <i className={proj.roleInProject === 'LEADER' ? "bi bi-arrow-down-circle-fill" : "bi bi-arrow-up-circle-fill"}></i>
                                      </button>
                                    )}
                                    
                                    {/* Banned/Removed cụ thể theo dự án */}
                                    {member.roleName !== "WORKSPACE_ADMIN" && (
                                      <button 
                                        className={`${styles["tag-action-btn"]} ${styles["danger"]}`}
                                        title="Remove from Project"
                                        onClick={() => handleRemoveFromProjectDetail(proj.projectId, member.userId)}
                                      >
                                        <i className="bi bi-x-circle-fill"></i>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                
                                {/* Chọn để thêm vào dự án mới */}
                                {member.roleName !== "WORKSPACE_ADMIN" && (
                                  <div className={styles["add-to-project-wrapper"]}>
                                    <select
                                      className={styles["add-to-project-select"]}
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleAddToProjectDetail(Number(e.target.value), member.userId);
                                        }
                                      }}
                                    >
                                      <option value="">+ Add to Project</option>
                                      {projects
                                        .filter(p => !member.projects?.some(mp => mp.projectId === p.id))
                                        .map(p => (
                                          <option key={p.id} value={p.id}>{p.name}</option>
                                        ))
                                      }
                                    </select>
                                  </div>
                                )}

                                {(!member.projects || member.projects.length === 0) && member.roleName === "WORKSPACE_ADMIN" && (
                                  <span style={{ color: "var(--admin-text-muted)", fontStyle: "italic", fontSize: "0.78rem" }}>—</span>
                                )}
                              </div>
                            </td>
                            <td>
                              {member.roleName !== "WORKSPACE_ADMIN" && (
                                <div className={styles["actions-cell-buttons"]}>
                                  <button
                                    className={`${styles["btn-workspace-toggle"]} ${member.active ? styles["danger"] : styles["success"]}`}
                                    title={member.active ? "Disable all WorkSpace" : "Enable all WorkSpace"}
                                    onClick={() => handleToggleMemberStatus(member.userId, member.active)}
                                  >
                                    <i className={member.active ? "bi bi-lock-fill" : "bi bi-unlock-fill"}></i>
                                    {member.active ? "Disable all WorkSpace" : "Enable all WorkSpace"}
                                  </button>
                                </div>
                              )}
                              {member.roleName === "WORKSPACE_ADMIN" && (
                                <span style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontStyle: "italic" }}>
                                  Workspace Admin (Owner)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}

          {/* TAB 3: PROJECTS MANAGEMENT */}
          {activeTab === "projects" && (() => {
            const filteredProjects = projects.filter(p =>
              p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
              (p.description || "").toLowerCase().includes(projectSearchQuery.toLowerCase())
            );

            // Progress = completedTaskCount / taskCount (real data from DB)
            const getProgress = (proj: ProjectResponse) => {
              if (!proj.taskCount || proj.taskCount === 0) return 0;
              return Math.round((proj.completedTaskCount / proj.taskCount) * 100);
            };

            // Status derived from real progress %
            const getStatus = (progress: number, taskCount: number) => {
              if (taskCount === 0) return { label: "No tasks", cls: "proj-status-notask" };
              if (progress >= 70) return { label: "On track", cls: "proj-status-ontrack" };
              if (progress >= 30) return { label: "At risk", cls: "proj-status-atrisk" };
              return { label: "Off track", cls: "proj-status-offtrack" };
            };

            // Avatar initials from project name
            const projInitials = (name: string) => {
              const words = name.trim().split(/\s+/);
              if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
              return name.substring(0, 3).toUpperCase();
            };

            return (
              <>
                {/* Page Header */}
                <div className={styles["page-header"]}>
                  <div className={styles["header-title-area"]}>
                    <h1 className={styles["header-title"]}>Projects</h1>
                    <span className={styles["header-subtitle"]}>Here's what's happening today.</span>
                  </div>
                  <div className={styles["page-header-actions"]}>
                    <button
                      className={styles["btn-primary"]}
                      onClick={() => setShowProjModal(true)}
                    >
                      <i className="bi bi-plus-lg"></i> New project
                    </button>
                  </div>
                </div>

                {/* Filter bar */}
                <div className={styles["proj-filter-bar"]}>
                  <div className={styles["input-search-wrapper"]} style={{ width: "240px" }}>
                    <i className="bi bi-search"></i>
                    <input
                      type="text"
                      className={styles["search-box-input"]}
                      placeholder="Search projects..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className={styles["proj-filter-chips"]}>
                    <div className={styles["proj-filter-chip"]}>
                      <i className="bi bi-funnel"></i> Status: All
                    </div>
                    <div className={styles["proj-filter-chip"]}>
                      <i className="bi bi-person"></i> Owner: Anyone
                    </div>
                  </div>

                  <div className={styles["proj-view-toggle"]}>
                    <button
                      className={`${styles["view-toggle-btn"]} ${projectViewMode === "grid" ? styles["active"] : ""}`}
                      onClick={() => setProjectViewMode("grid")}
                      title="Grid view"
                    >
                      <i className="bi bi-grid-3x3-gap"></i>
                    </button>
                    <button
                      className={`${styles["view-toggle-btn"]} ${projectViewMode === "list" ? styles["active"] : ""}`}
                      onClick={() => setProjectViewMode("list")}
                      title="List view"
                    >
                      <i className="bi bi-list-ul"></i>
                    </button>
                  </div>
                </div>

                {/* PROJECT GRID */}
                {projectViewMode === "grid" && (
                  <div className={styles["proj-card-grid"]}>
                    {filteredProjects.length === 0 ? (
                      <div className={styles["proj-empty-state"]}>
                        <i className="bi bi-folder2-open"></i>
                        <p>No projects found. Create your first project.</p>
                      </div>
                    ) : (
                      filteredProjects.map((proj) => {
                        const progress = getProgress(proj);
                        const status = getStatus(progress, proj.taskCount);

                        return (
                          <div key={proj.id} className={styles["proj-card"]}>
                            {/* Card Header */}
                            <div className={styles["proj-card-header"]}>
                              <div className={styles["proj-card-avatar"]}>
                                {projInitials(proj.name)}
                              </div>
                              <div className={styles["proj-card-title-group"]}>
                                <h3 className={styles["proj-card-name"]}>{proj.name}</h3>
                                <p className={styles["proj-card-desc"]}>
                                  {proj.description || "No description provided."}
                                </p>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className={styles["proj-progress-section"]}>
                              <div className={styles["proj-progress-label"]}>
                                <span>Progress</span>
                                <span className={styles["proj-progress-pct"]}>{progress}%</span>
                              </div>
                              <div className={styles["proj-progress-track"]}>
                                <div
                                  className={styles["proj-progress-fill"]}
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Status + Leader */}
                            <div className={styles["proj-card-meta"]}>
                              <span className={`${styles["proj-status-badge"]} ${styles[status.cls]}`}>
                                <span className={styles["proj-status-dot"]}></span>
                                {status.label}
                              </span>
                              <span className={styles["proj-leader-label"]}>
                                <i className="bi bi-person-fill"></i> {proj.leaderUsername || "N/A"}
                              </span>
                            </div>

                            {/* Stats Row — real data from DB */}
                            <div className={styles["proj-stats-row"]}>
                              <div className={styles["proj-stat-item"]}>
                                <span className={styles["proj-stat-value"]}>{proj.taskCount}</span>
                                <span className={styles["proj-stat-label"]}>Tasks</span>
                              </div>
                              <div className={styles["proj-stat-item"]}>
                                <span className={styles["proj-stat-value"]}>{proj.completedTaskCount}</span>
                                <span className={styles["proj-stat-label"]}>Done</span>
                              </div>
                              <div className={styles["proj-stat-item"]}>
                                <span className={styles["proj-stat-value"]}>
                                  {proj.members?.length || 0}
                                  {proj.maxMembers ? ` / ${proj.maxMembers}` : ""}
                                </span>
                                <span className={styles["proj-stat-label"]}>Members</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* PROJECT LIST VIEW */}
                {projectViewMode === "list" && (
                  <div className={styles["card-table-container"]}>
                    <table className={styles["admin-table"]}>
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Leader</th>
                          <th>Progress</th>
                          <th>Status</th>
                          <th>Tasks</th>
                          <th>Done</th>
                          <th>Members</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProjects.map((proj) => {
                          const progress = getProgress(proj);
                          const status = getStatus(progress, proj.taskCount);
                          return (
                            <tr key={proj.id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div className={styles["proj-card-avatar"]} style={{ width: "32px", height: "32px", fontSize: "0.65rem", flexShrink: 0 }}>
                                    {projInitials(proj.name)}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{proj.name}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>{proj.description || "—"}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: "0.82rem" }}>{proj.leaderUsername}</td>
                              <td style={{ minWidth: "130px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div className={styles["proj-progress-track"]} style={{ flex: 1 }}>
                                    <div className={styles["proj-progress-fill"]} style={{ width: `${progress}%` }}></div>
                                  </div>
                                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--admin-primary)", minWidth: "36px" }}>{progress}%</span>
                                </div>
                              </td>
                              <td>
                                <span className={`${styles["proj-status-badge"]} ${styles[status.cls]}`}>
                                  <span className={styles["proj-status-dot"]}></span>
                                  {status.label}
                                </span>
                              </td>
                              <td style={{ fontSize: "0.88rem", fontWeight: 600 }}>{proj.taskCount}</td>
                              <td style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--admin-success)" }}>{proj.completedTaskCount}</td>
                              <td style={{ fontSize: "0.88rem" }}>
                                {proj.members?.length || 0}
                                {proj.maxMembers ? ` / ${proj.maxMembers}` : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          })()}

          {/* TAB 4: WORKSPACE SETTINGS */}

          {activeTab === "settings" && (
            <>
              <div className={styles["page-header"]}>
                <div className={styles["header-title-area"]}>
                  <h1 className={styles["header-title"]}>Workspace Settings</h1>
                  <span className={styles["header-subtitle"]}>Thay đổi tên thương hiệu và mô tả tổng quan của Tổ chức.</span>
                </div>
              </div>

              <div className={styles["settings-form-container"]}>
                <form onSubmit={handleUpdateWorkspace} className={styles["modal-body"]} style={{ padding: 0 }}>
                  <div className={styles["form-group"]}>
                    <label htmlFor="ws-name">Tên Workspace/Tổ chức</label>
                    <input
                      type="text"
                      id="ws-name"
                      className={styles["form-control"]}
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles["form-group"]}>
                    <label htmlFor="ws-desc">Mô tả tổng quan</label>
                    <textarea
                      id="ws-desc"
                      className={styles["form-textarea"]}
                      value={wsDesc}
                      onChange={(e) => setWsDesc(e.target.value)}
                    />
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <button type="submit" className={styles["btn-primary"]}>
                      <i className="bi bi-save"></i> Lưu cài đặt thay đổi
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* TAB 5: PROFILE VIEW */}
          {activeTab === "profile" && (
            <>
              <div className={styles["page-header"]}>
                <div className={styles["header-title-area"]}>
                  <h1 className={styles["header-title"]}>My Profile</h1>
                  <span className={styles["header-subtitle"]}>Thông tin định danh và vai trò toàn hệ thống của bạn.</span>
                </div>
              </div>

              <div className={styles["profile-card-container"]}>
                <div className={styles["profile-avatar-large"]}>
                  {getInitials(user?.username || "Admin")}
                </div>
                
                <div className={styles["profile-details"]}>
                  <h2 className={styles["profile-name"]}>{user?.username || "Workspace Administrator"}</h2>
                  
                  <div className={styles["profile-meta-item"]}>
                    Email đăng ký: <strong>{user?.email}</strong>
                  </div>
                  
                  <div className={styles["profile-meta-item"]}>
                    Vai trò hiện tại: <strong>{user?.role} (Workspace admin)</strong>
                  </div>
                  
                  <div className={styles["profile-meta-item"]}>
                    Tổ chức đang hoạt động: <strong>{currentWorkspaceName} (ID: {user?.workspaceId})</strong>
                  </div>

                  <div className={styles["profile-meta-item"]}>
                    Trạng thái tài khoản: <span style={{ color: "var(--admin-success)", fontWeight: "bold" }}>Hoạt động</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 6: WORKSPACE HISTORY VIEW */}
          {activeTab === "history" && (
            <>
              <div className={styles["page-header"]}>
                <div className={styles["header-title-area"]}>
                  <h1 className={styles["header-title"]}>Workspace History</h1>
                  <span className={styles["header-subtitle"]}>Lịch sử hoạt động và các task đã hoàn thành trên các Workspace.</span>
                </div>
              </div>

              <div className={styles["history-list"]}>
                {userWorkspaces.length === 0 ? (
                  <div className={styles["empty-state-history"]}>
                    <i className="bi bi-clock-history"></i>
                    <p>Bạn chưa tham gia Workspace nào.</p>
                  </div>
                ) : (
                  userWorkspaces.map((ws) => {
                    const isActive = ws.workspaceId === (workspace?.id || user?.workspaceId);
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
            </>
          )}

        </section>
      </main>

      {/* POPUP MODAL 1: MỜI THÀNH VIÊN VÀO WORKSPACE */}
      {showInviteModal && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal-content"]}>
            <div className={styles["modal-header"]}>
              <h3>Mời thành viên mới gia nhập Workspace</h3>
              <button className={styles["modal-close-btn"]} onClick={() => setShowInviteModal(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleInviteMember}>
              <div className={styles["modal-body"]}>
                <div className={styles["form-group"]}>
                  <label htmlFor="invite-email">Địa chỉ Email thành viên</label>
                  <input
                    type="email"
                    id="invite-email"
                    className={styles["form-control"]}
                    placeholder="email@congty.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles["form-group"]}>
                  <label htmlFor="invite-role">Gán vai trò mặc định</label>
                  <select
                    id="invite-role"
                    className={styles["form-select"]}
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "LEADER" | "MEMBER")}
                  >
                    <option value="MEMBER">MEMBER (Thành viên chuẩn)</option>
                    <option value="LEADER">LEADER (Dự án trưởng)</option>
                  </select>
                </div>
                
                <p style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", margin: 0 }}>
                  * Nếu Email người dùng chưa có tài khoản trong hệ thống Task OS, hệ thống sẽ tự động tạo một tài khoản nháp bảo mật để người dùng kích hoạt.
                </p>
              </div>

              <div className={styles["modal-footer"]}>
                <button type="button" className={styles["btn-secondary"]} onClick={() => setShowInviteModal(false)}>Hủy bỏ</button>
                <button type="submit" className={styles["btn-primary"]}>Gửi lời mời tham gia</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: TẠO DỰ ÁN MỚI */}
      {showProjModal && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal-content"]}>
            <div className={styles["modal-header"]}>
              <h3>Khởi tạo dự án mới trong Workspace</h3>
              <button className={styles["modal-close-btn"]} onClick={() => setShowProjModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className={styles["modal-body"]}>
                <div className={styles["form-group"]}>
                  <label htmlFor="proj-name">Tên dự án</label>
                  <input
                    type="text"
                    id="proj-name"
                    className={styles["form-control"]}
                    placeholder="Nhập tên dự án"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles["form-group"]}>
                  <label htmlFor="proj-desc">Mô tả ngắn gọn</label>
                  <textarea
                    id="proj-desc"
                    className={styles["form-textarea"]}
                    placeholder="Mô tả công việc của dự án..."
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                  />
                </div>

                <div className={styles["form-group"]}>
                  <label htmlFor="proj-leader">Chỉ định Dự án trưởng (Leader)*</label>
                  <select
                    id="proj-leader"
                    className={styles["form-select"]}
                    value={newProjLeader}
                    onChange={(e) => setNewProjLeader(Number(e.target.value))}
                    required
                  >
                    <option value={0}>-- Chọn trưởng nhóm (phải thuộc Workspace) --</option>
                    {members
                      .filter(m => m.active) // Chỉ chọn các thành viên đang hoạt động
                      .map(m => (
                        <option key={m.userId} value={m.userId}>
                          {m.username} ({m.email}) - {m.roleName}
                        </option>
                      ))}
                  </select>
                </div>

                <div className={styles["form-group"]}>
                  <label htmlFor="proj-max-members">Số lượng thành viên tối đa (Max members)*</label>
                  <input
                    type="number"
                    id="proj-max-members"
                    className={styles["form-control"]}
                    placeholder="Nhập số lượng thành viên tối đa (Ví dụ: 10)"
                    value={newProjMaxMembers}
                    onChange={(e) => setNewProjMaxMembers(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
              </div>

              <div className={styles["modal-footer"]}>
                <button type="button" className={styles["btn-secondary"]} onClick={() => setShowProjModal(false)}>Hủy bỏ</button>
                <button type="submit" className={styles["btn-primary"]} disabled={!newProjLeader}>Tạo dự án</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: CREATE OR JOIN WORKSPACE */}
      {showCreateWorkspaceModal && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal-content"]}>
            <div className={styles["modal-header"]} style={{ borderBottom: "none", paddingBottom: 0 }}>
              <div style={{ display: "flex", gap: "15px", width: "100%", borderBottom: "1px solid var(--admin-border)" }}>
                <button
                  type="button"
                  style={{
                    padding: "10px 15px",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    border: "none",
                    background: "none",
                    color: wsModalTab === "create" ? "var(--admin-primary)" : "var(--admin-text-muted)",
                    borderBottom: wsModalTab === "create" ? "2px solid var(--admin-primary)" : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  onClick={() => { setWsModalTab("create"); setWsModalError(""); setWsModalSuccess(""); }}
                >
                  <i className="bi bi-plus-circle"></i> Create Workspace
                </button>
                <button
                  type="button"
                  style={{
                    padding: "10px 15px",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    border: "none",
                    background: "none",
                    color: wsModalTab === "join" ? "var(--admin-primary)" : "var(--admin-text-muted)",
                    borderBottom: wsModalTab === "join" ? "2px solid var(--admin-primary)" : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  onClick={() => { setWsModalTab("join"); setWsModalError(""); setWsModalSuccess(""); }}
                >
                  <i className="bi bi-key"></i> Join Workspace
                </button>
              </div>
              <button className={styles["modal-close-btn"]} onClick={() => setShowCreateWorkspaceModal(false)}>&times;</button>
            </div>
            
            <div className={styles["modal-body"]}>
              {wsModalError && (
                <div className={`${styles["alert-box"]} ${styles["alert-error"]}`} style={{ marginBottom: "15px", padding: "10px" }}>
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{wsModalError}</span>
                </div>
              )}
              {wsModalSuccess && (
                <div className={`${styles["alert-box"]} ${styles["alert-success"]}`} style={{ marginBottom: "15px", padding: "10px" }}>
                  <i className="bi bi-check-circle-fill"></i>
                  <span>{wsModalSuccess}</span>
                </div>
              )}

              {wsModalTab === "create" ? (
                <form onSubmit={handleCreateNewWorkspaceSubmit}>
                  <div className={styles["form-group"]}>
                    <label htmlFor="modal-ws-name">Tên doanh nghiệp / Tổ chức</label>
                    <input
                      type="text"
                      id="modal-ws-name"
                      className={styles["form-control"]}
                      placeholder="Ví dụ: Vinamilk, FPT Software,..."
                      value={newWSNameInput}
                      onChange={(e) => setNewWSNameInput(e.target.value)}
                      disabled={wsModalLoading}
                      required
                    />
                  </div>

                  <div className={styles["form-group"]}>
                    <label htmlFor="modal-ws-desc">Mô tả chi tiết (Tùy chọn)</label>
                    <textarea
                      id="modal-ws-desc"
                      className={styles["form-textarea"]}
                      placeholder="Mô tả mục tiêu hoạt động của tổ chức..."
                      value={newWSDescInput}
                      onChange={(e) => setNewWSDescInput(e.target.value)}
                      disabled={wsModalLoading}
                    />
                  </div>

                  <div className={styles["modal-footer"]} style={{ padding: "10px 0 0 0" }}>
                    <button type="button" className={styles["btn-secondary"]} onClick={() => setShowCreateWorkspaceModal(false)} disabled={wsModalLoading}>Hủy bỏ</button>
                    <button type="submit" className={styles["btn-primary"]} disabled={wsModalLoading}>
                      {wsModalLoading ? "Đang khởi tạo..." : "Tạo Workspace"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleJoinNewWorkspaceSubmit}>
                  <div className={styles["form-group"]}>
                    <label htmlFor="modal-join-code">Mã mời Workspace (Invitation Key)</label>
                    <input
                      type="text"
                      id="modal-join-code"
                      className={styles["form-control"]}
                      placeholder="Ví dụ: WS-A2B4C6D8"
                      value={joinWSCodeInput}
                      onChange={(e) => setJoinWSCodeInput(e.target.value)}
                      disabled={wsModalLoading}
                      required
                    />
                  </div>

                  <div className={styles["modal-footer"]} style={{ padding: "10px 0 0 0" }}>
                    <button type="button" className={styles["btn-secondary"]} onClick={() => setShowCreateWorkspaceModal(false)} disabled={wsModalLoading}>Hủy bỏ</button>
                    <button type="submit" className={styles["btn-primary"]} disabled={wsModalLoading}>
                      {wsModalLoading ? "Đang xử lý..." : "Tham gia Space"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkspaceAdminDashboard;
