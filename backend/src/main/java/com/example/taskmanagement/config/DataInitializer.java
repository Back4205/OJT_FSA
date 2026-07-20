package com.example.taskmanagement.config;

import com.example.taskmanagement.model.*;
import com.example.taskmanagement.model.enums.*;
import com.example.taskmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

/**
 * Lớp chịu trách nhiệm khởi tạo dữ liệu mẫu (Seed Data) cho cơ sở dữ liệu
 * khi ứng dụng khởi chạy lần đầu hoặc cơ sở dữ liệu đang trống.
 * Toàn bộ mã nguồn và ghi chú bằng tiếng Việt để dễ dàng hiểu logic dữ liệu.
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMembershipRepository workspaceMembershipRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;

    @Override
    public void run(String... args) {
        // --- 1. SEED CHO CÁC ROLE HỆ THỐNG ---
        // Đảm bảo cả 4 vai trò bắt buộc [SUPER_ADMIN, WORKSPACE_ADMIN, LEADER, MEMBER] đều tồn tại trong DB
        for (RoleName roleName : RoleName.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                Role role = new Role();
                role.setName(roleName);
                roleRepository.save(role);
            }
        }

        // Lấy thực thể Role sau khi đã chắc chắn tồn tại
        Role adminRole = roleRepository.findByName(RoleName.WORKSPACE_ADMIN).orElseThrow();
        Role leaderRole = roleRepository.findByName(RoleName.LEADER).orElseThrow();
        Role memberRole = roleRepository.findByName(RoleName.MEMBER).orElseThrow();

        // --- 2. SEED CHO SUPER ADMIN (QUẢN TRỊ TOÀN NỀN TẢNG) ---
        String superAdminEmail = "superadmin@platform.com";
        if (userRepository.findByEmail(superAdminEmail).isEmpty()) {
            User superAdmin = new User();
            superAdmin.setUsername("superadmin");
            superAdmin.setEmail(superAdminEmail);
            superAdmin.setPassword(passwordEncoder.encode("admin123"));
            superAdmin.setSuperAdmin(true);
            superAdmin.setProvider(AuthProvider.LOCAL);
            superAdmin.setActive(true);
            superAdmin.setEmailVerified(true);
            userRepository.save(superAdmin);
        }

        // --- 3. SEED CHO WORKSPACE MẪU ---
        String sampleWorkspaceName = "Google Workspace";
        Workspace workspace = workspaceRepository.findByName(sampleWorkspaceName).orElse(null);
        if (workspace == null) {
            workspace = new Workspace();
            workspace.setName(sampleWorkspaceName);
            workspace.setDescription("Workspace dùng để test môi trường phát triển của dự án - Google Organization");
            workspace.setActive(true);
            workspace.setInviteCode("GOOGLE123");
            workspace = workspaceRepository.save(workspace);
        } else if (workspace.getInviteCode() == null) {
            workspace.setInviteCode("GOOGLE123");
            workspace = workspaceRepository.save(workspace);
        }

        // --- 4. SEED CHO CÁC USER THỬ NGHIỆM ---
        // Tạo User Quản trị Workspace (Workspace Admin)
        String adminEmail = "admin@google.com";
        User workspaceAdminUser = userRepository.findByEmail(adminEmail).orElse(null);
        if (workspaceAdminUser == null) {
            workspaceAdminUser = new User();
            workspaceAdminUser.setUsername("google_admin");
            workspaceAdminUser.setEmail(adminEmail);
            workspaceAdminUser.setPassword(passwordEncoder.encode("admin123"));
            workspaceAdminUser.setSuperAdmin(false);
            workspaceAdminUser.setProvider(AuthProvider.LOCAL);
            workspaceAdminUser.setActive(true);
            workspaceAdminUser.setEmailVerified(true);
            workspaceAdminUser = userRepository.save(workspaceAdminUser);
        }

        // Tạo User Trưởng dự án (Leader)
        String leaderEmail = "leader@google.com";
        User leaderUser = userRepository.findByEmail(leaderEmail).orElse(null);
        if (leaderUser == null) {
            leaderUser = new User();
            leaderUser.setUsername("google_leader");
            leaderUser.setEmail(leaderEmail);
            leaderUser.setPassword(passwordEncoder.encode("leader123"));
            leaderUser.setSuperAdmin(false);
            leaderUser.setProvider(AuthProvider.LOCAL);
            leaderUser.setActive(true);
            leaderUser.setEmailVerified(true);
            leaderUser = userRepository.save(leaderUser);
        }

        // Tạo User Nhân viên thực thi (Member)
        String memberEmail = "member@google.com";
        User memberUser = userRepository.findByEmail(memberEmail).orElse(null);
        if (memberUser == null) {
            memberUser = new User();
            memberUser.setUsername("google_member");
            memberUser.setEmail(memberEmail);
            memberUser.setPassword(passwordEncoder.encode("member123"));
            memberUser.setSuperAdmin(false);
            memberUser.setProvider(AuthProvider.LOCAL);
            memberUser.setActive(true);
            memberUser.setEmailVerified(true);
            memberUser = userRepository.save(memberUser);
        }

        // Tạo User Nhân viên đã bị khóa khỏi Workspace (Inactive Member)
        String inactiveEmail = "inactive@google.com";
        User inactiveUser = userRepository.findByEmail(inactiveEmail).orElse(null);
        if (inactiveUser == null) {
            inactiveUser = new User();
            inactiveUser.setUsername("google_inactive");
            inactiveUser.setEmail(inactiveEmail);
            inactiveUser.setPassword(passwordEncoder.encode("member123"));
            inactiveUser.setSuperAdmin(false);
            inactiveUser.setProvider(AuthProvider.LOCAL);
            inactiveUser.setActive(true);
            inactiveUser.setEmailVerified(true);
            inactiveUser = userRepository.save(inactiveUser);
        }

        // --- 5. SEED CHO WORKSPACE MEMBERSHIPS (LIÊN KẾT USER VỚI WORKSPACE + ROLE) ---
        // Admin Membership
        if (workspaceMembershipRepository.findByUserIdAndWorkspaceId(workspaceAdminUser.getId(), workspace.getId()).isEmpty()) {
            WorkspaceMembership ms = new WorkspaceMembership();
            ms.setUser(workspaceAdminUser);
            ms.setWorkspace(workspace);
            ms.setRole(adminRole);
            ms.setActive(true);
            workspaceMembershipRepository.save(ms);
        }

        // Leader Membership
        if (workspaceMembershipRepository.findByUserIdAndWorkspaceId(leaderUser.getId(), workspace.getId()).isEmpty()) {
            WorkspaceMembership ms = new WorkspaceMembership();
            ms.setUser(leaderUser);
            ms.setWorkspace(workspace);
            ms.setRole(leaderRole);
            ms.setActive(true);
            workspaceMembershipRepository.save(ms);
        }

        // Active Member Membership
        if (workspaceMembershipRepository.findByUserIdAndWorkspaceId(memberUser.getId(), workspace.getId()).isEmpty()) {
            WorkspaceMembership ms = new WorkspaceMembership();
            ms.setUser(memberUser);
            ms.setWorkspace(workspace);
            ms.setRole(memberRole);
            ms.setActive(true);
            workspaceMembershipRepository.save(ms);
        }

        // Locked / Inactive Member Membership
        if (workspaceMembershipRepository.findByUserIdAndWorkspaceId(inactiveUser.getId(), workspace.getId()).isEmpty()) {
            WorkspaceMembership ms = new WorkspaceMembership();
            ms.setUser(inactiveUser);
            ms.setWorkspace(workspace);
            ms.setRole(memberRole);
            ms.setActive(false); // Đặt trạng thái bị khóa để thử nghiệm các bộ lọc và khóa thành viên
            workspaceMembershipRepository.save(ms);
        }

        // --- 6. SEED DỰ ÁN MẪU (PROJECT) ---
        Project project = null;
        var projects = projectRepository.findByWorkspaceId(workspace.getId());
        if (projects.isEmpty()) {
            project = new Project();
            project.setName("Task Management Web App");
            project.setDescription("Dự án xây dựng ứng dụng quản lý nhiệm vụ đa khách thuê (SaaS) cho doanh nghiệp nhỏ.");
            project.setLeader(leaderUser);
            project.setWorkspace(workspace);

            // Thêm các thành viên tham gia dự án
            Set<User> projectMembers = new HashSet<>();
            projectMembers.add(leaderUser);
            projectMembers.add(memberUser);
            project.setMembers(projectMembers);

            project = projectRepository.save(project);
        } else {
            project = projects.get(0);
        }

        // --- 7. SEED NHIỆM VỤ MẪU (TASKS) ---
        if (taskRepository.findByProjectId(project.getId()).isEmpty()) {
            // Task 1: Thiết kế Database (Trạng thái: DONE, Độ ưu tiên: HIGH)
            Task task1 = new Task();
            task1.setTitle("Thiết kế sơ đồ cơ sở dữ liệu");
            task1.setDescription("Phác thảo các thực thể User, Project, Workspace và các mối quan hệ khoá ngoại.");
            task1.setPriority(TaskPriority.HIGH);
            task1.setStatus(TaskStatus.DONE);
            task1.setDeadline(LocalDate.now().minusDays(2));
            task1.setProject(project);
            task1.setAssignee(leaderUser);
            taskRepository.save(task1);

            // Task 2: Viết APIs cho Workspace Admin (Trạng thái: IN_PROGRESS, Độ ưu tiên: HIGH)
            Task task2 = new Task();
            task2.setTitle("Hiện thực hóa API quản trị Workspace");
            task2.setDescription("Viết 11 APIs bao gồm quản lý member, project và các báo cáo stats.");
            task2.setPriority(TaskPriority.HIGH);
            task2.setStatus(TaskStatus.IN_PROGRESS);
            task2.setDeadline(LocalDate.now().plusDays(5));
            task2.setProject(project);
            task2.setAssignee(memberUser);
            taskRepository.save(task2);

            // Task 3: Viết Unit Test cho Service (Trạng thái: TODO, Độ ưu tiên: MEDIUM)
            Task task3 = new Task();
            task3.setTitle("Viết Unit Tests cho các nghiệp vụ chính");
            task3.setDescription("Đảm bảo độ bao phủ mã đạt trên 80% đối với các lớp Service và Controller.");
            task3.setPriority(TaskPriority.MEDIUM);
            task3.setStatus(TaskStatus.TODO);
            task3.setDeadline(LocalDate.now().plusDays(10));
            task3.setProject(project);
            task3.setAssignee(memberUser);
            taskRepository.save(task3);

            // Task 4: Liên kết giao diện React (Trạng thái: TODO, Độ ưu tiên: LOW)
            Task task4 = new Task();
            task4.setTitle("Tích hợp API với Client React");
            task4.setDescription("Nối API login, switch workspace và dashboard thống kê lên giao diện.");
            task4.setPriority(TaskPriority.LOW);
            task4.setStatus(TaskStatus.TODO);
            task4.setDeadline(LocalDate.now().plusDays(15));
            task4.setProject(project);
            task4.setAssignee(null); // Chưa gán
            taskRepository.save(task4);
        }
    }
}
