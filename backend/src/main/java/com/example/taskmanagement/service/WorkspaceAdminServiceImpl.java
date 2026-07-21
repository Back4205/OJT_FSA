package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.*;
import com.example.taskmanagement.dto.response.*;
import com.example.taskmanagement.model.*;
import com.example.taskmanagement.model.enums.*;
import com.example.taskmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Lớp triển khai các API nghiệp vụ cho role WORKSPACE_ADMIN
 */
@Service
@RequiredArgsConstructor
public class WorkspaceAdminServiceImpl implements WorkspaceAdminService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMembershipRepository workspaceMembershipRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public WorkspaceResponse getWorkspaceDetails(Long workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Workspace với ID: " + workspaceId));
        return WorkspaceResponse.fromEntity(workspace);
    }

    @Override
    @Transactional
    public WorkspaceResponse updateWorkspaceDetails(Long workspaceId, WorkspaceUpdateRequest request) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Workspace với ID: " + workspaceId));

        String newName = request.getName().trim();
        // Kiểm tra trùng tên Workspace khác
        if (!workspace.getName().equalsIgnoreCase(newName) && workspaceRepository.existsByName(newName)) {
            throw new IllegalArgumentException("Tên Workspace/Tổ chức này đã được sử dụng");
        }

        workspace.setName(newName);
        workspace.setDescription(request.getDescription());
        Workspace savedWorkspace = workspaceRepository.save(workspace);

        return WorkspaceResponse.fromEntity(savedWorkspace);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MembershipResponse> getWorkspaceMembers(Long workspaceId, Boolean isActive, String roleName) {
        List<WorkspaceMembership> memberships = workspaceMembershipRepository.findByWorkspaceId(workspaceId);
        List<com.example.taskmanagement.model.Project> projects = projectRepository.findByWorkspaceId(workspaceId);

        return memberships.stream()
                .filter(m -> {
                    // Lọc theo trạng thái hoạt động nếu có yêu cầu
                    if (isActive != null && m.isActive() != isActive) {
                        return false;
                    }
                    // Lọc theo vai trò nếu có yêu cầu
                    if (roleName != null && !roleName.trim().isEmpty()) {
                        if (!m.getRole().getName().name().equalsIgnoreCase(roleName.trim())) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(m -> {
                    List<MembershipResponse.ProjectDetail> userProjects = projects.stream()
                            .filter(p -> p.getMembers().contains(m.getUser()) || p.getLeader().equals(m.getUser()))
                            .map(p -> {
                                String role = p.getLeader().equals(m.getUser()) ? "LEADER" : "MEMBER";
                                return new MembershipResponse.ProjectDetail(p.getId(), p.getName(), role);
                            })
                            .collect(Collectors.toList());
                    return MembershipResponse.fromEntity(m, userProjects);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MembershipResponse addWorkspaceMember(Long workspaceId, MemberAddRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        
        // Xác thực vai trò phân cấp (chỉ cho phép gán LEADER hoặc MEMBER)
        RoleName roleToAssign;
        try {
            roleToAssign = RoleName.valueOf(request.getRoleName().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Vai trò không hợp lệ. Chỉ chấp nhận LEADER hoặc MEMBER");
        }

        if (roleToAssign != RoleName.LEADER && roleToAssign != RoleName.MEMBER) {
            throw new IllegalArgumentException("Quản trị viên Workspace chỉ được gán vai trò LEADER hoặc MEMBER");
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Workspace hiện tại"));

        Role dbRole = roleRepository.findByName(roleToAssign)
                .orElseThrow(() -> new IllegalStateException("Hệ thống chưa cấu hình vai trò: " + roleToAssign));

        // Tìm User theo email
        User user = userRepository.findByEmail(email).orElse(null);

        // Trường hợp người dùng chưa tồn tại trên toàn bộ platform -> tự động tạo tài khoản nháp
        if (user == null) {
            user = new User();
            String usernamePart = email.split("@")[0];
            String uniqueUsername = usernamePart;
            int counter = 1;
            while (userRepository.existsByUsername(uniqueUsername)) {
                uniqueUsername = usernamePart + counter;
                counter++;
            }
            user.setUsername(uniqueUsername);
            user.setEmail(email);
            // Tạo mật khẩu ngẫu nhiên để tài khoản nháp tạm thời an toàn
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setProvider(AuthProvider.LOCAL);
            user.setActive(true);
            user.setEmailVerified(false); // Chưa xác thực email
            user = userRepository.save(user);
        }

        // Kiểm tra xem user này đã từng tham gia Workspace này chưa
        var membershipOpt = workspaceMembershipRepository.findByUserIdAndWorkspaceId(user.getId(), workspaceId);

        WorkspaceMembership membership;
        if (membershipOpt.isPresent()) {
            membership = membershipOpt.get();
            if (membership.isActive()) {
                throw new IllegalArgumentException("Người dùng có email này đã hoạt động trong Workspace");
            }
            // Nếu đã từng có membership nhưng bị khóa -> Kích hoạt lại và cập nhật vai trò mới
            membership.setActive(true);
            membership.setRole(dbRole);
        } else {
            // Tạo mới membership hoàn toàn
            membership = new WorkspaceMembership();
            membership.setUser(user);
            membership.setWorkspace(workspace);
            membership.setRole(dbRole);
            membership.setActive(true);
        }

        WorkspaceMembership savedMembership = workspaceMembershipRepository.save(membership);
        return MembershipResponse.fromEntity(savedMembership);
    }

    @Override
    @Transactional
    public MembershipResponse updateMemberRole(Long workspaceId, Long userId, MemberRoleUpdateRequest request) {
        WorkspaceMembership membership = workspaceMembershipRepository.findByUserIdAndWorkspaceId(userId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thành viên này trong Workspace hiện tại"));

        // Xác thực vai trò phân cấp (chỉ cho phép gán LEADER hoặc MEMBER)
        RoleName newRoleName;
        try {
            newRoleName = RoleName.valueOf(request.getRoleName().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Vai trò đổi mới không hợp lệ. Chỉ chấp nhận LEADER hoặc MEMBER");
        }

        if (newRoleName != RoleName.LEADER && newRoleName != RoleName.MEMBER) {
            throw new IllegalArgumentException("Quản trị viên Workspace chỉ được cập nhật vai trò sang LEADER hoặc MEMBER");
        }

        Role dbRole = roleRepository.findByName(newRoleName)
                .orElseThrow(() -> new IllegalStateException("Hệ thống chưa cấu hình vai trò: " + newRoleName));

        // Cập nhật vai trò
        membership.setRole(dbRole);
        WorkspaceMembership savedMembership = workspaceMembershipRepository.save(membership);

        List<com.example.taskmanagement.model.Project> projects = projectRepository.findByWorkspaceId(workspaceId);
        List<MembershipResponse.ProjectDetail> userProjects = projects.stream()
                .filter(p -> p.getMembers().contains(savedMembership.getUser()) || p.getLeader().equals(savedMembership.getUser()))
                .map(p -> {
                    String role = p.getLeader().equals(savedMembership.getUser()) ? "LEADER" : "MEMBER";
                    return new MembershipResponse.ProjectDetail(p.getId(), p.getName(), role);
                })
                .collect(Collectors.toList());

        return MembershipResponse.fromEntity(savedMembership, userProjects);
    }

    @Override
    @Transactional
    public void updateProjectMemberRole(Long workspaceId, Long projectId, Long userId, MemberRoleUpdateRequest request) {
        Project project = projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Dự án không tồn tại hoặc không thuộc Workspace này"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thành viên này"));

        RoleName newRole;
        try {
            newRole = RoleName.valueOf(request.getRoleName().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Vai trò đổi mới không hợp lệ. Chỉ chấp nhận LEADER hoặc MEMBER");
        }

        if (newRole == RoleName.LEADER) {
            // Thăng chức làm Leader dự án
            project.getMembers().add(user);
            project.setLeader(user);
            projectRepository.save(project);

            // [Phương án B] Tự động nâng workspace role lên LEADER nếu hiện là MEMBER
            WorkspaceMembership membership = workspaceMembershipRepository
                    .findByUserIdAndWorkspaceId(userId, workspaceId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy membership của user trong Workspace"));
            upgradeToLeaderIfNeeded(membership);

        } else if (newRole == RoleName.MEMBER) {
            // Hạ chức xuống làm Member dự án
            if (project.getLeader().getId().equals(userId)) {
                throw new IllegalArgumentException("Không thể trực tiếp hạ chức Project Leader. Vui lòng thăng chức thành viên khác làm Leader trước.");
            }
            project.getMembers().add(user);
            projectRepository.save(project);

            // [Phương án B] Nếu user không còn là leader của project nào khác trong WS → hạ về MEMBER
            boolean stillLeadsAnotherProject = projectRepository.findByWorkspaceId(workspaceId)
                    .stream()
                    .anyMatch(p -> !p.getId().equals(projectId) && p.getLeader().getId().equals(userId));
            if (!stillLeadsAnotherProject) {
                WorkspaceMembership membership = workspaceMembershipRepository
                        .findByUserIdAndWorkspaceId(userId, workspaceId)
                        .orElseThrow();
                if (membership.getRole().getName() == RoleName.LEADER) {
                    Role memberRole = roleRepository.findByName(RoleName.MEMBER)
                            .orElseThrow(() -> new IllegalStateException("Không tìm thấy role MEMBER"));
                    membership.setRole(memberRole);
                    workspaceMembershipRepository.save(membership);
                }
            }
        }
    }

    @Override
    @Transactional
    public void deactivateWorkspaceMember(Long workspaceId, Long userId) {
        WorkspaceMembership membership = workspaceMembershipRepository.findByUserIdAndWorkspaceId(userId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thành viên này trong Workspace"));

        // Luật nghiệp vụ: Không được phép tự loại bỏ hoặc vô hiệu hóa vai trò quản trị viên chính mình/ADMIN
        if (membership.getRole().getName() == RoleName.WORKSPACE_ADMIN) {
            throw new IllegalArgumentException("Không thể vô hiệu hóa tài khoản quản trị viên Workspace");
        }

        membership.setActive(false);
        workspaceMembershipRepository.save(membership);
    }

    @Override
    @Transactional
    public void activateWorkspaceMember(Long workspaceId, Long userId) {
        WorkspaceMembership membership = workspaceMembershipRepository.findByUserIdAndWorkspaceId(userId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thành viên này trong Workspace"));

        membership.setActive(true);
        workspaceMembershipRepository.save(membership);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> getWorkspaceProjects(Long workspaceId) {
        List<Project> projects = projectRepository.findByWorkspaceId(workspaceId);
        return projects.stream()
                .map(ProjectResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProjectResponse createProject(Long workspaceId, ProjectCreateRequest request) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Workspace hiện tại"));

        // Kiểm tra xem leader được chọn có trực thuộc và đang hoạt động trong Workspace hay không
        WorkspaceMembership leaderMembership = workspaceMembershipRepository
                .findByUserIdAndWorkspaceId(request.getLeaderId(), workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Leader được chọn không phải là thành viên của Workspace này"));

        if (!leaderMembership.isActive()) {
            throw new IllegalArgumentException("Tài khoản của Leader được chọn hiện đang bị khóa trong Workspace");
        }

        Project project = new Project();
        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());
        project.setLeader(leaderMembership.getUser());
        project.setWorkspace(workspace);
        project.setMaxMembers(request.getMaxMembers());

        // Tự động thêm leader làm thành viên đầu tiên của dự án
        project.getMembers().add(leaderMembership.getUser());

        Project savedProject = projectRepository.save(project);

        // [Phương án B] Tự động nâng workspace role lên LEADER nếu hiện là MEMBER
        upgradeToLeaderIfNeeded(leaderMembership);

        return ProjectResponse.fromEntity(savedProject);
    }

    @Override
    @Transactional
    public ProjectResponse addProjectMember(Long workspaceId, Long projectId, ProjectMemberRequest request) {
        Project project = projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Dự án không tồn tại hoặc không thuộc Workspace này"));

        // Kiểm tra xem người dùng được add có trực thuộc và đang hoạt động trong Workspace không
        WorkspaceMembership membership = workspaceMembershipRepository
                .findByUserIdAndWorkspaceId(request.getUserId(), workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng cần thêm không thuộc thành viên Workspace này"));

        if (!membership.isActive()) {
            throw new IllegalArgumentException("Tài khoản thành viên cần thêm đang bị khóa");
        }

        if (project.getMembers().contains(membership.getUser())) {
            throw new IllegalArgumentException("Thành viên đã có trong dự án này");
        }

        if (project.getMaxMembers() != null && project.getMembers().size() >= project.getMaxMembers()) {
            throw new IllegalArgumentException("Dự án đã đạt giới hạn số lượng thành viên tối đa quy định (" + project.getMaxMembers() + ")");
        }

        // Add vào project
        project.getMembers().add(membership.getUser());
        Project savedProject = projectRepository.save(project);

        return ProjectResponse.fromEntity(savedProject);
    }

    @Override
    @Transactional
    public ProjectResponse removeProjectMember(Long workspaceId, Long projectId, Long userId) {
        Project project = projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Dự án không tồn tại hoặc không thuộc Workspace này"));

        User userToRemove = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng này"));

        // Luật nghiệp vụ: Không được gỡ leader ra khỏi dự án bằng phương thức này (Leader quản lý dự án)
        if (project.getLeader().getId().equals(userId)) {
            throw new IllegalArgumentException("Không thể gỡ bỏ Project Leader khỏi dự án này");
        }

        project.getMembers().remove(userToRemove);
        Project savedProject = projectRepository.save(project);

        return ProjectResponse.fromEntity(savedProject);
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats(Long workspaceId) {
        long totalProjects = projectRepository.countByWorkspaceId(workspaceId);

        // Đếm tổng số thành viên đang hoạt động trong Workspace
        long totalMembers = workspaceMembershipRepository.findByWorkspaceId(workspaceId).stream()
                .filter(WorkspaceMembership::isActive)
                .count();

        long totalTasks = taskRepository.countByProjectWorkspaceId(workspaceId);

        // Báo cáo số lượng task theo Status
        Map<String, Long> tasksByStatus = new HashMap<>();
        for (TaskStatus status : TaskStatus.values()) {
            long countStr = taskRepository.countByProjectWorkspaceIdAndStatus(workspaceId, status);
            tasksByStatus.put(status.name(), countStr);
        }

        // Báo cáo số lượng task theo mức độ ưu tiên Priority
        Map<String, Long> tasksByPriority = new HashMap<>();
        for (TaskPriority priority : TaskPriority.values()) {
            long countPri = taskRepository.countByProjectWorkspaceIdAndPriority(workspaceId, priority);
            tasksByPriority.put(priority.name(), countPri);
        }

        return DashboardStatsResponse.builder()
                .totalProjects(totalProjects)
                .totalMembers(totalMembers)
                .totalTasks(totalTasks)
                .tasksByStatus(tasksByStatus)
                .tasksByPriority(tasksByPriority)
                .build();
    }

    // @Override
    // public ProjectResponse changeProjectLeader(Long workspaceId, Long projectId, Long newLeaderUserId) {
    //     // TODO Auto-generated method stub
    //     throw new UnsupportedOperationException("Unimplemented method 'changeProjectLeader'");
    // }

    /**
     * [Phương án B] Helper: Tự động nâng workspace membership role lên LEADER
     * nếu user hiện đang là MEMBER. Gọi mỗi khi một user được chỉ định làm
     * project leader trong workspace này.
     */
    private void upgradeToLeaderIfNeeded(WorkspaceMembership membership) {
        RoleName currentRole = membership.getRole().getName();
        if (currentRole == RoleName.MEMBER) {
            Role leaderRole = roleRepository.findByName(RoleName.LEADER)
                    .orElseThrow(() -> new IllegalStateException("Không tìm thấy role LEADER trong hệ thống"));
            membership.setRole(leaderRole);
            workspaceMembershipRepository.save(membership);
        }
        // Nếu đã là LEADER hoặc WORKSPACE_ADMIN → không cần thay đổi
    }
}