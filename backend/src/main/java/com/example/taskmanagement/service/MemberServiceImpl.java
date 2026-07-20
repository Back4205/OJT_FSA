package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.response.member.MemberActivityResponse;
import com.example.taskmanagement.dto.response.member.MemberDashboardResponse;
import com.example.taskmanagement.dto.response.member.MemberTaskResponse;
import com.example.taskmanagement.model.Task;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.Workspace;
import com.example.taskmanagement.model.WorkspaceMembership;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.model.enums.TaskStatus;
import com.example.taskmanagement.repository.TaskRepository;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.repository.WorkspaceMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    private final UserRepository userRepository;
    private final WorkspaceMembershipRepository workspaceMembershipRepository;
    private final TaskRepository taskRepository;

    @Override
    @Transactional(readOnly = true)
    public MemberDashboardResponse getDashboard(Authentication authentication) {
        String email = com.example.taskmanagement.security.AuthEmailExtractor.extractEmail(authentication);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        WorkspaceMembership membership = resolveActiveMembership(authentication, user);
        if (membership == null) {
            return MemberDashboardResponse.builder()
                    .userId(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .role(user.isSuperAdmin() ? RoleName.SUPER_ADMIN.name() : RoleName.MEMBER.name())
                    .totalAssignedTasks(0)
                    .completedTasks(0)
                    .inProgressTasks(0)
                    .dueSoonTasks(0)
                    .overdueTasks(0)
                    .tasks(List.of())
                    .activities(List.of())
                    .build();
        }

        Workspace workspace = membership.getWorkspace();
        List<Task> tasks = new ArrayList<>(taskRepository
                .findByAssigneeIdAndProjectWorkspaceIdOrderByDeadlineAsc(user.getId(), workspace.getId()));
        tasks.sort(Comparator.comparing(Task::getDeadline, Comparator.nullsLast(Comparator.naturalOrder())));

        LocalDate today = LocalDate.now();
        LocalDate dueSoonLimit = today.plusDays(7);

        long completedTasks = tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count();
        long inProgressTasks = tasks.stream().filter(task -> task.getStatus() == TaskStatus.IN_PROGRESS).count();
        long reviewTasks = tasks.stream().filter(task -> task.getStatus() == TaskStatus.REVIEW).count();
        long dueSoonTasks = tasks.stream()
                .filter(task -> task.getStatus() != TaskStatus.DONE)
                .filter(task -> task.getDeadline() != null)
                .filter(task -> !task.getDeadline().isBefore(today) && !task.getDeadline().isAfter(dueSoonLimit))
                .count();
        long overdueTasks = tasks.stream()
                .filter(task -> task.getStatus() != TaskStatus.DONE)
                .filter(task -> task.getDeadline() != null)
                .filter(task -> task.getDeadline().isBefore(today))
                .count();

        List<MemberActivityResponse> activities = buildActivities(tasks);

        return MemberDashboardResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .workspaceId(workspace.getId())
                .workspaceName(workspace.getName())
                .role(membership.getRole().getName().name())
                .totalAssignedTasks(tasks.size())
                .completedTasks(completedTasks)
                .inProgressTasks(inProgressTasks)
                .reviewTasks(reviewTasks)
                .dueSoonTasks(dueSoonTasks)
                .overdueTasks(overdueTasks)
                .tasks(tasks.stream().map(MemberTaskResponse::fromEntity).toList())
                .activities(activities)
                .build();
    }

    private WorkspaceMembership resolveActiveMembership(Authentication authentication, User user) {
        Long activeWorkspaceId = null;
        if (authentication != null && authentication.getPrincipal() instanceof com.example.taskmanagement.security.CustomUserDetails customUserDetails) {
            activeWorkspaceId = customUserDetails.getActiveWorkspaceId();
        }

        if (activeWorkspaceId != null) {
            return workspaceMembershipRepository.findByUserIdAndWorkspaceId(user.getId(), activeWorkspaceId)
                    .filter(WorkspaceMembership::isActive)
                    .orElse(null);
        }

        List<WorkspaceMembership> activeMemberships = workspaceMembershipRepository.findByUserIdAndIsActive(user.getId(), true);
        return activeMemberships.isEmpty() ? null : activeMemberships.get(0);
    }

    private List<MemberActivityResponse> buildActivities(List<Task> tasks) {
        if (tasks.isEmpty()) {
            return List.of(MemberActivityResponse.builder()
                    .title("No active tasks yet")
                    .detail("Once a task is assigned, it will appear here.")
                    .timeLabel("today")
                    .tone("neutral")
                    .build());
        }

        return tasks.stream()
                .limit(4)
                .map(task -> {
                    String title;
                    String detail;
                    String tone = "info";
                    if (task.getStatus() == TaskStatus.DONE) {
                        title = "Completed task";
                        detail = task.getTitle();
                        tone = "success";
                    } else if (task.getStatus() == TaskStatus.IN_PROGRESS) {
                        title = "In progress";
                        detail = task.getTitle();
                        tone = "warning";
                    } else {
                        title = "Planned task";
                        detail = task.getTitle();
                    }

                    String timeLabel = task.getDeadline() != null ? task.getDeadline().toString() : "No deadline";
                    return MemberActivityResponse.builder()
                            .title(title)
                            .detail(detail)
                            .timeLabel(timeLabel)
                            .tone(tone)
                            .build();
                })
                .toList();
    }

    @Override
    @Transactional
    public MemberTaskResponse updateTaskStatus(Authentication authentication, Long taskId, TaskStatus status) {
        String email = com.example.taskmanagement.security.AuthEmailExtractor.extractEmail(authentication);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        WorkspaceMembership membership = resolveActiveMembership(authentication, user);
        if (membership == null) {
            throw new IllegalStateException("No active workspace membership found");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        Long taskWorkspaceId = task.getProject().getWorkspace().getId();
        if (!taskWorkspaceId.equals(membership.getWorkspace().getId())) {
            throw new IllegalStateException("Task is outside your active workspace");
        }

        if (task.getAssignee() == null || !task.getAssignee().getId().equals(user.getId())) {
            throw new IllegalStateException("You can only update tasks assigned to you");
        }

        if (status == null) {
            throw new IllegalArgumentException("Task status is required");
        }

        task.setStatus(status);
        taskRepository.save(task);
        return MemberTaskResponse.fromEntity(task);
    }
}
