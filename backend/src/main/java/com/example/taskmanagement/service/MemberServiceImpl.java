package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.response.member.MemberActivityResponse;
import com.example.taskmanagement.dto.response.member.MemberDashboardResponse;
import com.example.taskmanagement.dto.response.member.MemberNotificationResponse;
import com.example.taskmanagement.dto.response.member.MemberTaskResponse;
import com.example.taskmanagement.dto.response.member.MemberWeeklyActivityResponse;
import com.example.taskmanagement.model.Notification;
import com.example.taskmanagement.model.Task;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.Workspace;
import com.example.taskmanagement.model.WorkspaceMembership;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.model.enums.ActionType;
import com.example.taskmanagement.model.enums.TaskStatus;
import com.example.taskmanagement.repository.ActivityLogRepository;
import com.example.taskmanagement.repository.TaskRepository;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.repository.WorkspaceMembershipRepository;
import com.example.taskmanagement.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {
    private static final Pattern ASSIGNMENT_NOTIFICATION_PATTERN = Pattern.compile(
            "^(.+?)(\\s+assigned task\\s+\".+?\"\\s+to\\s+)(.+?)(\\s+in project\\b.*)$",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern JOIN_REQUEST_NOTIFICATION_PATTERN = Pattern.compile(
            "^(.+?)(\\s+requested to join workspace\\b.*)$",
            Pattern.CASE_INSENSITIVE
    );

    private final UserRepository userRepository;
    private final WorkspaceMembershipRepository workspaceMembershipRepository;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final ActivityLogRepository activityLogRepository;

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
                    .workspaceActive(false)
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
                .findAssignedOrUnassignedForMember(user.getId(), workspace.getId()));
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
                .workspaceActive(workspace.isActive())
                .role(membership.getRole().getName().name())
                .totalAssignedTasks(tasks.size())
                .completedTasks(completedTasks)
                .inProgressTasks(inProgressTasks)
                .reviewTasks(reviewTasks)
                .dueSoonTasks(dueSoonTasks)
                .overdueTasks(overdueTasks)
                .tasks(tasks.stream().map(MemberTaskResponse::fromEntity).toList())
                .activities(activities)
                .weeklyActivity(buildWeeklyActivity(user, workspace, tasks))
                .build();
    }

    private List<MemberWeeklyActivityResponse> buildWeeklyActivity(
            User user,
            Workspace workspace,
            List<Task> tasks
    ) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDateTime start = weekStart.atStartOfDay();
        LocalDateTime end = weekStart.plusDays(7).atStartOfDay();

        Map<LocalDate, Integer> assignedByDay = notificationRepository.findByUserIdOrderByTimestampDesc(user.getId()).stream()
                .filter(notification -> notification.getTimestamp() != null)
                .filter(notification -> !notification.getTimestamp().isBefore(start) && notification.getTimestamp().isBefore(end))
                .filter(notification -> notification.getTask() != null)
                .filter(notification -> notification.getTask().getProject() != null)
                .filter(notification -> notification.getTask().getProject().getWorkspace() != null)
                .filter(notification -> notification.getTask().getProject().getWorkspace().getId().equals(workspace.getId()))
                .collect(Collectors.groupingBy(
                        notification -> notification.getTimestamp().toLocalDate(),
                        Collectors.summingInt(notification -> 1)
                ));

        Set<Long> taskIds = tasks.stream()
                .map(Task::getId)
                .collect(Collectors.toSet());

        Map<LocalDate, Integer> completedByDay = taskIds.isEmpty()
                ? Map.of()
                : activityLogRepository.findByActionAndTargetTypeAndTargetIdInAndTimestampBetween(
                        ActionType.CHANGE_TASK_STATUS,
                        "Task",
                        taskIds,
                        start,
                        end
                ).stream()
                .filter(log -> log.getDescription() != null && log.getDescription().contains(TaskStatus.DONE.name()))
                .collect(Collectors.groupingBy(
                        log -> log.getTimestamp().toLocalDate(),
                        Collectors.summingInt(log -> 1)
                ));

        List<String> dayLabels = List.of("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun");
        List<MemberWeeklyActivityResponse> weeklyActivity = new ArrayList<>();
        for (int index = 0; index < dayLabels.size(); index += 1) {
            LocalDate day = weekStart.plusDays(index);
            weeklyActivity.add(MemberWeeklyActivityResponse.builder()
                    .day(dayLabels.get(index))
                    .assigned(assignedByDay.getOrDefault(day, 0))
                    .completed(completedByDay.getOrDefault(day, 0))
                    .build());
        }
        return weeklyActivity;
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
        if (!membership.getWorkspace().isActive()) {
            throw new IllegalStateException("Workspace is locked. You can view tasks only.");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        Long taskWorkspaceId = task.getProject().getWorkspace().getId();
        if (!taskWorkspaceId.equals(membership.getWorkspace().getId())) {
            throw new IllegalStateException("Task is outside your active workspace");
        }

        if (Boolean.TRUE.equals(task.getProject().getIsDeleted())) {
            throw new IllegalStateException("Project has ended. You can view tasks only.");
        }

        if (task.getAssignee() == null || !task.getAssignee().getId().equals(user.getId())) {
            throw new IllegalStateException("You can only update tasks assigned to you.");
        }

        if (status == null) {
            throw new IllegalArgumentException("Task status is required.");
        }

        // Enforce: task must be assigned before moving to IN_PROGRESS
        if (status == TaskStatus.IN_PROGRESS && task.getAssignee() == null) {
            throw new IllegalStateException("Task must be assigned to someone before moving to IN_PROGRESS.");
        }

        task.setStatus(status);
        taskRepository.save(task);
        return MemberTaskResponse.fromEntity(task);
    }

    @Override
    @Transactional
    public List<MemberNotificationResponse> getNotifications(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Long activeWorkspaceId = null;
        if (authentication.getPrincipal() instanceof com.example.taskmanagement.security.CustomUserDetails) {
            activeWorkspaceId = ((com.example.taskmanagement.security.CustomUserDetails) authentication.getPrincipal()).getActiveWorkspaceId();
        }

        boolean isWorkspaceAdmin = false;
        if (activeWorkspaceId != null) {
            WorkspaceMembership membership = workspaceMembershipRepository
                    .findByUserIdAndWorkspaceId(user.getId(), activeWorkspaceId)
                    .orElse(null);
            if (membership != null && membership.getRole().getName() == RoleName.WORKSPACE_ADMIN) {
                isWorkspaceAdmin = true;
            }
        }

        List<Notification> list;
        if (isWorkspaceAdmin && activeWorkspaceId != null) {
            ensurePendingWorkspaceJoinNotifications(activeWorkspaceId, user);
            list = notificationRepository.findByUserIdOrWorkspaceIdOrderByTimestampDesc(user.getId(), activeWorkspaceId);
        } else {
            list = notificationRepository.findByUserIdOrderByTimestampDesc(user.getId());
        }

        return list.stream()
                .map(n -> toNotificationResponse(n, user.getId()))
                .toList();
    }

    private void ensurePendingWorkspaceJoinNotifications(Long workspaceId, User notificationOwner) {
        workspaceMembershipRepository.findByWorkspaceId(workspaceId).stream()
                .filter(membership -> !membership.isActive())
                .filter(membership -> membership.getWorkspace() != null && membership.getUser() != null)
                .forEach(membership -> {
                    String content = buildJoinRequestContent(membership.getWorkspace(), membership.getUser());
                    String legacyContent = membership.getUser().getEmail() + " requested to join workspace \""
                            + membership.getWorkspace().getName() + "\".";
                    if (notificationRepository.existsByWorkspaceIdAndContent(workspaceId, content)
                            || notificationRepository.existsByWorkspaceIdAndContent(workspaceId, legacyContent)) {
                        return;
                    }

                    Notification notification = new Notification();
                    notification.setUser(notificationOwner);
                    notification.setWorkspace(membership.getWorkspace());
                    notification.setContent(content);
                    notificationRepository.save(notification);
                });
    }

    private String buildJoinRequestContent(Workspace workspace, User requester) {
        return displayName(requester) + " requested to join workspace \"" + workspace.getName() + "\".";
    }

    @Override
    @Transactional
    public MemberNotificationResponse updateNotificationReadState(
            Authentication authentication,
            Long notificationId,
            boolean read
    ) {
        User user = getAuthenticatedUser(authentication);
        Long activeWorkspaceId = null;
        if (authentication.getPrincipal() instanceof com.example.taskmanagement.security.CustomUserDetails) {
            activeWorkspaceId = ((com.example.taskmanagement.security.CustomUserDetails) authentication.getPrincipal()).getActiveWorkspaceId();
        }

        boolean isWorkspaceAdmin = false;
        if (activeWorkspaceId != null) {
            WorkspaceMembership membership = workspaceMembershipRepository
                    .findByUserIdAndWorkspaceId(user.getId(), activeWorkspaceId)
                    .orElse(null);
            if (membership != null && membership.getRole().getName() == RoleName.WORKSPACE_ADMIN) {
                isWorkspaceAdmin = true;
            }
        }

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        boolean hasPermission = notification.getUser().getId().equals(user.getId());
        if (!hasPermission && isWorkspaceAdmin && activeWorkspaceId != null && notification.getWorkspace() != null) {
            if (notification.getWorkspace().getId().equals(activeWorkspaceId)) {
                hasPermission = true;
            }
        }
        if (!hasPermission && isWorkspaceAdmin && activeWorkspaceId != null && notification.getTask() != null) {
            if (notification.getTask().getProject().getWorkspace().getId().equals(activeWorkspaceId)) {
                hasPermission = true;
            }
        }

        if (!hasPermission) {
            throw new IllegalArgumentException("Notification not found or access denied");
        }

        notification.setRead(read);
        return toNotificationResponse(notificationRepository.save(notification), user.getId());
    }

    @Override
    @Transactional
    public List<MemberNotificationResponse> markAllNotificationsRead(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Long activeWorkspaceId = null;
        if (authentication.getPrincipal() instanceof com.example.taskmanagement.security.CustomUserDetails) {
            activeWorkspaceId = ((com.example.taskmanagement.security.CustomUserDetails) authentication.getPrincipal()).getActiveWorkspaceId();
        }

        boolean isWorkspaceAdmin = false;
        if (activeWorkspaceId != null) {
            WorkspaceMembership membership = workspaceMembershipRepository
                    .findByUserIdAndWorkspaceId(user.getId(), activeWorkspaceId)
                    .orElse(null);
            if (membership != null && membership.getRole().getName() == RoleName.WORKSPACE_ADMIN) {
                isWorkspaceAdmin = true;
            }
        }

        List<Notification> notifications;
        if (isWorkspaceAdmin && activeWorkspaceId != null) {
            notifications = notificationRepository.findByUserIdOrWorkspaceIdOrderByTimestampDesc(user.getId(), activeWorkspaceId);
        } else {
            notifications = notificationRepository.findByUserIdOrderByTimestampDesc(user.getId());
        }

        notifications.stream()
                .filter(notification -> !notification.isRead())
                .forEach(notification -> notification.setRead(true));

        return notificationRepository.saveAll(notifications).stream()
                .map(n -> toNotificationResponse(n, user.getId()))
                .toList();
    }

    private MemberNotificationResponse toNotificationResponse(Notification notification, Long currentUserId) {
        MemberNotificationResponse response = MemberNotificationResponse.fromEntity(notification, currentUserId);
        response.setContent(resolveNotificationDisplayNames(response.getContent()));
        return response;
    }

    private String resolveNotificationDisplayNames(String content) {
        if (content == null) {
            return null;
        }

        Matcher assignmentMatcher = ASSIGNMENT_NOTIFICATION_PATTERN.matcher(content);
        if (assignmentMatcher.matches()) {
            String assigner = resolveDisplayNameToken(assignmentMatcher.group(1));
            String recipient = resolveDisplayNameToken(assignmentMatcher.group(3));
            return assigner + assignmentMatcher.group(2) + recipient + assignmentMatcher.group(4);
        }

        Matcher joinRequestMatcher = JOIN_REQUEST_NOTIFICATION_PATTERN.matcher(content);
        if (joinRequestMatcher.matches()) {
            String requester = resolveDisplayNameToken(joinRequestMatcher.group(1));
            return requester + joinRequestMatcher.group(2);
        }

        return content;
    }

    private String resolveDisplayNameToken(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (!trimmed.contains("@")) {
            return trimmed;
        }

        return userRepository.findByEmail(trimmed)
                .map(User::getUsername)
                .filter(username -> username != null && !username.isBlank())
                .orElse(trimmed);
    }

    private String displayName(User user) {
        if (user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername();
        }
        return user.getEmail();
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = com.example.taskmanagement.security.AuthEmailExtractor.extractEmail(authentication);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}
