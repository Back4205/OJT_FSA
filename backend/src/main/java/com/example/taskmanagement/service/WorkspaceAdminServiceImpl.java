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
 * Service implementation for WORKSPACE_ADMIN business APIs.
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
    private final ActivityLogRepository activityLogRepository;
    private final NotificationRepository notificationRepository;

    @Override
    @Transactional(readOnly = true)
    public WorkspaceResponse getWorkspaceDetails(Long workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not found with ID: " + workspaceId));
        return WorkspaceResponse.fromEntity(workspace);
    }

    @Override
    @Transactional
    public WorkspaceResponse updateWorkspaceDetails(Long workspaceId, WorkspaceUpdateRequest request) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not found with ID: " + workspaceId));

        String newName = request.getName().trim();
        // Check duplicate workspace names.
        if (!workspace.getName().equalsIgnoreCase(newName) && workspaceRepository.existsByName(newName)) {
            throw new IllegalArgumentException("This workspace/organization name is already in use");
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
                    // Filter by active state when requested.
                    if (isActive != null && m.isActive() != isActive) {
                        return false;
                    }
                    // Filter by role when requested.
                    if (roleName != null && !roleName.trim().isEmpty()) {
                        if (!m.getRole().getName().name().equalsIgnoreCase(roleName.trim())) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(m -> {
                    List<MembershipResponse.ProjectDetail> userProjects = projects.stream()
                            .filter(p -> p.getIsDeleted() == null || !p.getIsDeleted())
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
        
        // Validate role hierarchy; only LEADER or MEMBER can be assigned.
        RoleName roleToAssign;
        try {
            roleToAssign = RoleName.valueOf(request.getRoleName().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role. Only LEADER or MEMBER is accepted");
        }

        if (roleToAssign != RoleName.LEADER && roleToAssign != RoleName.MEMBER) {
            throw new IllegalArgumentException("Workspace admins can assign only LEADER or MEMBER roles");
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Current workspace not found"));

        Role dbRole = roleRepository.findByName(roleToAssign)
                .orElseThrow(() -> new IllegalStateException("Role is not configured in the system: " + roleToAssign));

        // Find the user by email.
        User user = userRepository.findByEmail(email).orElse(null);

        // If the user does not exist on the platform, create a draft account.
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
            // Create a random password so the draft account is temporarily safe.
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setProvider(AuthProvider.LOCAL);
            user.setActive(true);
            user.setEmailVerified(false); // Email is not verified yet.
            user = userRepository.save(user);
        }

        // Check whether this user has joined this workspace before.
        var membershipOpt = workspaceMembershipRepository.findByUserIdAndWorkspaceId(user.getId(), workspaceId);

        WorkspaceMembership membership;
        if (membershipOpt.isPresent()) {
            membership = membershipOpt.get();
            if (membership.isActive()) {
                throw new IllegalArgumentException("A user with this email is already active in the workspace");
            }
            // If a locked membership exists, reactivate it and update the role.
            membership.setActive(true);
            membership.setRole(dbRole);
        } else {
            // Create a completely new membership.
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
                .orElseThrow(() -> new IllegalArgumentException("This member was not found in the current workspace"));

        // Validate role hierarchy; only LEADER or MEMBER can be assigned.
        RoleName newRoleName;
        try {
            newRoleName = RoleName.valueOf(request.getRoleName().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid new role. Only LEADER or MEMBER is accepted");
        }

        if (newRoleName != RoleName.LEADER && newRoleName != RoleName.MEMBER) {
            throw new IllegalArgumentException("Workspace admins can update roles only to LEADER or MEMBER");
        }

        Role dbRole = roleRepository.findByName(newRoleName)
                .orElseThrow(() -> new IllegalStateException("Role is not configured in the system: " + newRoleName));

        // Update role.
        membership.setRole(dbRole);
        WorkspaceMembership savedMembership = workspaceMembershipRepository.save(membership);

        List<com.example.taskmanagement.model.Project> projects = projectRepository.findByWorkspaceId(workspaceId);
        List<MembershipResponse.ProjectDetail> userProjects = projects.stream()
                .filter(p -> p.getIsDeleted() == null || !p.getIsDeleted())
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
                .orElseThrow(() -> new IllegalArgumentException("Project does not exist or does not belong to this workspace"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("This member was not found"));

        RoleName newRole;
        try {
            newRole = RoleName.valueOf(request.getRoleName().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid new role. Only LEADER or MEMBER is accepted");
        }

        if (newRole == RoleName.LEADER) {
            // Promote to project leader.
            project.getMembers().add(user);
            project.setLeader(user);
            projectRepository.save(project);

            // Option B: automatically promote workspace role to LEADER if currently MEMBER.
            WorkspaceMembership membership = workspaceMembershipRepository
                    .findByUserIdAndWorkspaceId(userId, workspaceId)
                    .orElseThrow(() -> new IllegalArgumentException("User membership was not found in the workspace"));
            upgradeToLeaderIfNeeded(membership);

        } else if (newRole == RoleName.MEMBER) {
            // Demote to project member.
            if (project.getLeader().getId().equals(userId)) {
                throw new IllegalArgumentException("Cannot directly demote the project leader. Please promote another member to leader first.");
            }
            project.getMembers().add(user);
            projectRepository.save(project);

            // Option B: if the user no longer leads any other project in the workspace, demote to MEMBER.
            boolean stillLeadsAnotherProject = projectRepository.findByWorkspaceId(workspaceId)
                    .stream()
                    .anyMatch(p -> !p.getId().equals(projectId) && p.getLeader().getId().equals(userId));
            if (!stillLeadsAnotherProject) {
                WorkspaceMembership membership = workspaceMembershipRepository
                        .findByUserIdAndWorkspaceId(userId, workspaceId)
                        .orElseThrow();
                if (membership.getRole().getName() == RoleName.LEADER) {
                    Role memberRole = roleRepository.findByName(RoleName.MEMBER)
                            .orElseThrow(() -> new IllegalStateException("MEMBER role not found"));
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
                .orElseThrow(() -> new IllegalArgumentException("This member was not found in the workspace"));

        // Business rule: do not remove or deactivate the workspace admin account.
        if (membership.getRole().getName() == RoleName.WORKSPACE_ADMIN) {
            throw new IllegalArgumentException("Cannot deactivate the workspace admin account");
        }

        membership.setActive(false);
        workspaceMembershipRepository.save(membership);
    }

    @Override
    @Transactional
    public void activateWorkspaceMember(Long workspaceId, Long userId) {
        WorkspaceMembership membership = workspaceMembershipRepository.findByUserIdAndWorkspaceId(userId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("This member was not found in the workspace"));

        boolean wasInactive = !membership.isActive();
        membership.setActive(true);
        workspaceMembershipRepository.save(membership);

        if (wasInactive) {
            sendWorkspaceApprovalNotification(membership);
        }
    }

    private void sendWorkspaceApprovalNotification(WorkspaceMembership membership) {
        Notification notification = new Notification();
        notification.setUser(membership.getUser());
        notification.setWorkspace(membership.getWorkspace());
        notification.setContent("Your request to join workspace \"" + membership.getWorkspace().getName() + "\" has been approved.");
        notificationRepository.save(notification);
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
                .orElseThrow(() -> new IllegalArgumentException("Current workspace not found"));

        // Check that the selected leader belongs to and is active in the workspace.
        WorkspaceMembership leaderMembership = workspaceMembershipRepository
                .findByUserIdAndWorkspaceId(request.getLeaderId(), workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Selected leader is not a member of this workspace"));

        if (!leaderMembership.isActive()) {
            throw new IllegalArgumentException("Selected leader account is currently locked in the workspace");
        }

        Project project = new Project();
        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());
        project.setLeader(leaderMembership.getUser());
        project.setWorkspace(workspace);
        project.setMaxMembers(request.getMaxMembers());

        // Automatically add the leader as the first project member.
        project.getMembers().add(leaderMembership.getUser());

        Project savedProject = projectRepository.save(project);

        // Option B: automatically promote workspace role to LEADER if currently MEMBER.
        upgradeToLeaderIfNeeded(leaderMembership);

        return ProjectResponse.fromEntity(savedProject);
    }

    @Override
    @Transactional
    public ProjectResponse addProjectMember(Long workspaceId, Long projectId, ProjectMemberRequest request) {
        Project project = projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Project does not exist or does not belong to this workspace"));

        // Check that the user being added belongs to and is active in the workspace.
        WorkspaceMembership membership = workspaceMembershipRepository
                .findByUserIdAndWorkspaceId(request.getUserId(), workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("The user to add is not a member of this workspace"));

        if (!membership.isActive()) {
            throw new IllegalArgumentException("The member account to add is locked");
        }

        if (project.getMembers().contains(membership.getUser())) {
            throw new IllegalArgumentException("Member is already in this project");
        }

        if (project.getMaxMembers() != null && project.getMembers().size() >= project.getMaxMembers()) {
            throw new IllegalArgumentException("Project has reached the maximum member limit (" + project.getMaxMembers() + ")");
        }

        // Add to project.
        project.getMembers().add(membership.getUser());
        Project savedProject = projectRepository.save(project);

        return ProjectResponse.fromEntity(savedProject);
    }

    @Override
    @Transactional
    public ProjectResponse removeProjectMember(Long workspaceId, Long projectId, Long userId) {
        Project project = projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Project does not exist or does not belong to this workspace"));

        User userToRemove = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("This user was not found"));

        // Business rule: do not remove the project leader through this method.
        if (project.getLeader().getId().equals(userId)) {
            throw new IllegalArgumentException("Cannot remove the project leader from this project");
        }

        project.getMembers().remove(userToRemove);
        Project savedProject = projectRepository.save(project);

        return ProjectResponse.fromEntity(savedProject);
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats(Long workspaceId) {
        // Get active projects that have not been completed or soft-deleted.
        List<Project> activeProjects = projectRepository.findByWorkspaceId(workspaceId).stream()
                .filter(p -> p.getIsDeleted() == null || !p.getIsDeleted())
                .collect(Collectors.toList());

        long totalProjects = activeProjects.size();

        // Count active workspace members.
        long totalMembers = workspaceMembershipRepository.findByWorkspaceId(workspaceId).stream()
                .filter(WorkspaceMembership::isActive)
                .count();

        // Get active project IDs.
        List<Long> activeProjectIds = activeProjects.stream()
                .map(Project::getId)
                .collect(Collectors.toList());

        // Get all tasks in active projects.
        List<Task> activeTasks = activeProjectIds.isEmpty() ? new java.util.ArrayList<>()
                : taskRepository.findAll().stream()
                        .filter(t -> activeProjectIds.contains(t.getProject().getId()))
                        .collect(Collectors.toList());

        long totalTasks = activeTasks.size();

        // Report task counts by status for active projects.
        Map<String, Long> tasksByStatus = new HashMap<>();
        for (TaskStatus status : TaskStatus.values()) {
            long countStr = activeTasks.stream().filter(t -> t.getStatus() == status).count();
            tasksByStatus.put(status.name(), countStr);
        }

        // Report task counts by priority for active projects.
        Map<String, Long> tasksByPriority = new HashMap<>();
        for (TaskPriority priority : TaskPriority.values()) {
            long countPri = activeTasks.stream().filter(t -> t.getPriority() == priority).count();
            tasksByPriority.put(priority.name(), countPri);
        }

        // Calculate created and completed task counts for this week (Monday - Sunday).
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime startOfWeek = now.with(java.time.DayOfWeek.MONDAY).withHour(0).withMinute(0).withSecond(0).withNano(0);
        java.time.LocalDateTime endOfWeek = startOfWeek.plusDays(7);

        List<ActivityLog> logs = activityLogRepository.findTaskActivitiesInWorkspaceThisWeek(workspaceId, startOfWeek, endOfWeek);

        Long[] createdWeeklyArray = new Long[]{0L, 0L, 0L, 0L, 0L, 0L, 0L};
        Long[] completedWeeklyArray = new Long[]{0L, 0L, 0L, 0L, 0L, 0L, 0L};

        for (ActivityLog log : logs) {
            int dayIndex = log.getTimestamp().getDayOfWeek().getValue() - 1; // Monday is 1 -> index 0, Sunday is 7 -> index 6
            if (dayIndex >= 0 && dayIndex < 7) {
                if (log.getAction() == ActionType.CREATE_TASK) {
                    createdWeeklyArray[dayIndex]++;
                } else if (log.getAction() == ActionType.CHANGE_TASK_STATUS && 
                           log.getDescription() != null && 
                           log.getDescription().contains("→ DONE")) {
                    completedWeeklyArray[dayIndex]++;
                }
            }
        }

        List<Long> createdTasksWeekly = java.util.Arrays.asList(createdWeeklyArray);
        List<Long> completedTasksWeekly = java.util.Arrays.asList(completedWeeklyArray);

        // --- Calculate Growth (Week over Week) ---
        java.time.LocalDateTime sevenDaysAgo = now.minusDays(7);

        long pastTotalProjects = projectRepository.countActiveByWorkspaceIdAndCreatedAtBefore(workspaceId, sevenDaysAgo);
        long pastTotalMembers = workspaceMembershipRepository.countActiveByWorkspaceIdAndCreatedAtBefore(workspaceId, sevenDaysAgo);
        long pastTotalTasks = taskRepository.countByProjectWorkspaceIdAndCreatedAtBefore(workspaceId, sevenDaysAgo);
        long pastCompletedTasks = taskRepository.countByProjectWorkspaceIdAndStatusAndCreatedAtBefore(workspaceId, TaskStatus.DONE, sevenDaysAgo);
        long pastTodoTasks = taskRepository.countByProjectWorkspaceIdAndStatusAndCreatedAtBefore(workspaceId, TaskStatus.TODO, sevenDaysAgo);
        long pastReviewTasks = taskRepository.countByProjectWorkspaceIdAndStatusAndCreatedAtBefore(workspaceId, TaskStatus.REVIEW, sevenDaysAgo);

        double totalProjectsGrowth = calculateGrowth(totalProjects, pastTotalProjects);
        double totalMembersGrowth = calculateGrowth(totalMembers, pastTotalMembers);
        double totalTasksGrowth = calculateGrowth(totalTasks, pastTotalTasks);
        double completedTasksGrowth = calculateGrowth(tasksByStatus.getOrDefault(TaskStatus.DONE.name(), 0L), pastCompletedTasks);
        double todoTasksGrowth = calculateGrowth(tasksByStatus.getOrDefault(TaskStatus.TODO.name(), 0L), pastTodoTasks);
        double reviewTasksGrowth = calculateGrowth(tasksByStatus.getOrDefault(TaskStatus.REVIEW.name(), 0L), pastReviewTasks);

        return DashboardStatsResponse.builder()
                .totalProjects(totalProjects)
                .totalMembers(totalMembers)
                .totalTasks(totalTasks)
                .tasksByStatus(tasksByStatus)
                .tasksByPriority(tasksByPriority)
                .createdTasksWeekly(createdTasksWeekly)
                .completedTasksWeekly(completedTasksWeekly)
                .totalProjectsGrowth(totalProjectsGrowth)
                .totalMembersGrowth(totalMembersGrowth)
                .totalTasksGrowth(totalTasksGrowth)
                .completedTasksGrowth(completedTasksGrowth)
                .todoTasksGrowth(todoTasksGrowth)
                .reviewTasksGrowth(reviewTasksGrowth)
                .build();
    }

    private double calculateGrowth(long current, long past) {
        if (past == 0) {
            return current > 0 ? 100.0 : 0.0;
        }
        return ((double) (current - past) / past) * 100.0;
    }

    @Override
    @Transactional
    public void completeProject(Long workspaceId, Long projectId) {
        Project project = projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Project does not exist or does not belong to this workspace"));
        project.setIsDeleted(true);
        projectRepository.save(project);
    }

    @Override
    @Transactional
    public void reactivateProject(Long workspaceId, Long projectId) {
        Project project = projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Project does not exist or does not belong to this workspace"));
        project.setIsDeleted(false);
        projectRepository.save(project);
    }

    /**
     * Option B helper: automatically promote a workspace membership to LEADER
     * if the user is currently MEMBER. Called whenever a user is assigned as
     * project leader in this workspace.
     */
    private void upgradeToLeaderIfNeeded(WorkspaceMembership membership) {
        RoleName currentRole = membership.getRole().getName();
        if (currentRole == RoleName.MEMBER) {
            Role leaderRole = roleRepository.findByName(RoleName.LEADER)
                    .orElseThrow(() -> new IllegalStateException("LEADER role not found in the system"));
            membership.setRole(leaderRole);
            workspaceMembershipRepository.save(membership);
        }
        // If already LEADER or WORKSPACE_ADMIN, no change is needed.
    }

    @Override
    @Transactional(readOnly = true)
    public List<ActivityLogResponse> getActivityLogs(Long workspaceId) {
        List<ActivityLog> logs = activityLogRepository.findAllActivitiesInWorkspace(workspaceId);
        return logs.stream()
                .map(ActivityLogResponse::from)
                .toList();
    }
}
