package com.example.taskmanagement.config;

import com.example.taskmanagement.model.Project;
import com.example.taskmanagement.model.Role;
import com.example.taskmanagement.model.Task;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.Workspace;
import com.example.taskmanagement.model.WorkspaceMembership;
import com.example.taskmanagement.model.enums.AuthProvider;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.model.enums.TaskPriority;
import com.example.taskmanagement.model.enums.TaskStatus;
import com.example.taskmanagement.repository.ProjectRepository;
import com.example.taskmanagement.repository.RoleRepository;
import com.example.taskmanagement.repository.TaskRepository;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.repository.WorkspaceMembershipRepository;
import com.example.taskmanagement.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

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
        for (RoleName roleName : RoleName.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                Role role = new Role();
                role.setName(roleName);
                roleRepository.save(role);
            }
        }

        Role memberRole = roleRepository.findByName(RoleName.MEMBER).orElseThrow();

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

        String sampleWorkspaceName = "Google Workspace";
        Workspace workspace = workspaceRepository.findByName(sampleWorkspaceName).orElse(null);
        if (workspace == null) {
            workspace = new Workspace();
            workspace.setName(sampleWorkspaceName);
            workspace.setDescription("Sample workspace for member and admin flow");
            workspace.setActive(true);
            workspace.setInviteCode("GOOGLE123");
            workspace = workspaceRepository.save(workspace);
        } else if (workspace.getInviteCode() == null) {
            workspace.setInviteCode("GOOGLE123");
            workspace = workspaceRepository.save(workspace);
        }

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

        if (workspaceMembershipRepository.findByUserIdAndWorkspaceId(memberUser.getId(), workspace.getId()).isEmpty()) {
            WorkspaceMembership membership = new WorkspaceMembership();
            membership.setUser(memberUser);
            membership.setWorkspace(workspace);
            membership.setRole(memberRole);
            membership.setActive(true);
            workspaceMembershipRepository.save(membership);
        }

        if (workspaceMembershipRepository.findByUserIdAndWorkspaceId(inactiveUser.getId(), workspace.getId()).isEmpty()) {
            WorkspaceMembership membership = new WorkspaceMembership();
            membership.setUser(inactiveUser);
            membership.setWorkspace(workspace);
            membership.setRole(memberRole);
            membership.setActive(false);
            workspaceMembershipRepository.save(membership);
        }

        Project project = null;
        var projects = projectRepository.findByWorkspaceId(workspace.getId());
        if (projects.isEmpty()) {
            project = new Project();
            project.setName("Task Management Web App");
            project.setDescription("Sample SaaS project for platform and member workflows.");
            project.setLeader(memberUser);
            project.setWorkspace(workspace);

            Set<User> projectMembers = new HashSet<>();
            projectMembers.add(memberUser);
            projectMembers.add(inactiveUser);
            project.setMembers(projectMembers);

            project = projectRepository.save(project);
        } else {
            project = projects.get(0);
        }

        if (taskRepository.findByProjectId(project.getId()).isEmpty()) {
            Task task1 = new Task();
            task1.setTitle("Design data model");
            task1.setDescription("Draft user, project and workspace relations.");
            task1.setPriority(TaskPriority.HIGH);
            task1.setStatus(TaskStatus.DONE);
            task1.setDeadline(LocalDate.now().minusDays(2));
            task1.setProject(project);
            task1.setAssignee(memberUser);
            taskRepository.save(task1);

            Task task2 = new Task();
            task2.setTitle("Implement member dashboard API");
            task2.setDescription("Provide task, board and profile data for members.");
            task2.setPriority(TaskPriority.HIGH);
            task2.setStatus(TaskStatus.IN_PROGRESS);
            task2.setDeadline(LocalDate.now().plusDays(5));
            task2.setProject(project);
            task2.setAssignee(memberUser);
            taskRepository.save(task2);

            Task task3 = new Task();
            task3.setTitle("Write unit tests");
            task3.setDescription("Keep service and controller coverage above 80%.");
            task3.setPriority(TaskPriority.MEDIUM);
            task3.setStatus(TaskStatus.TODO);
            task3.setDeadline(LocalDate.now().plusDays(10));
            task3.setProject(project);
            task3.setAssignee(memberUser);
            taskRepository.save(task3);

            Task task4 = new Task();
            task4.setTitle("Connect React screens");
            task4.setDescription("Wire login, dashboard and role-specific flows.");
            task4.setPriority(TaskPriority.LOW);
            task4.setStatus(TaskStatus.TODO);
            task4.setDeadline(LocalDate.now().plusDays(15));
            task4.setProject(project);
            task4.setAssignee(null);
            taskRepository.save(task4);
        }
    }
}
