package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.CreateTaskRequest;
import com.example.taskmanagement.dto.request.UpdateTaskRequest;
import com.example.taskmanagement.dto.response.TaskResponse;
import com.example.taskmanagement.model.*;
import com.example.taskmanagement.model.enums.ActionType;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.model.enums.TaskPriority;
import com.example.taskmanagement.model.enums.TaskStatus;
import com.example.taskmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * @author Vương Bách
 */
@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final ActivityLogRepository activityLogRepository;

    // ─── Create ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TaskResponse createTask(CreateTaskRequest request,
                                   Long currentUserId, Long workspaceId) {
        // Lấy project và kiểm tra thuộc đúng workspace
        Project project = getProjectInWorkspace(request.getProjectId(), workspaceId);

        User currentUser = getUserById(currentUserId);

        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setPriority(request.getPriority());
        task.setStatus(TaskStatus.TODO);
        task.setDeadline(request.getDeadline());
        task.setProject(project);

        // Gán assignee nếu có
        if (request.getAssigneeId() != null) {
            User assignee = getUserById(request.getAssigneeId());
            validateAssigneeIsMember(project, assignee);
            task.setAssignee(assignee);
        }

        Task saved = taskRepository.save(task);

        // Ghi ActivityLog: tạo task
        logActivity(ActionType.CREATE_TASK, "Task", saved.getId(),
                "Tạo task \"" + saved.getTitle() + "\" trong project \"" + project.getName() + "\"",
                currentUser);

        // Gửi Notification cho assignee (nếu có và khác người tạo)
        if (saved.getAssignee() != null && !saved.getAssignee().getId().equals(currentUserId)) {
            sendAssignNotification(saved, currentUser);
        }

        return TaskResponse.from(saved);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<TaskResponse> getTasksByProject(Long projectId, Long workspaceId,
                                                 TaskStatus statusFilter, TaskPriority priorityFilter,
                                                 Pageable pageable) {
        // Kiểm tra project thuộc workspace
        if (!projectRepository.existsByIdAndWorkspaceId(projectId, workspaceId)) {
            throw new IllegalArgumentException(
                    "Project không tồn tại hoặc không thuộc workspace của bạn");
        }

        return taskRepository
                .findByProjectIdWithFilters(projectId, statusFilter, priorityFilter, pageable)
                .map(TaskResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId, Long workspaceId) {
        Task task = taskRepository.findByIdAndWorkspaceId(taskId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Task không tồn tại hoặc không thuộc workspace của bạn"));
        return TaskResponse.from(task);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TaskResponse updateTask(Long taskId, UpdateTaskRequest request,
                                   Long currentUserId, String currentRole, Long workspaceId) {
        Task task = getTaskInWorkspace(taskId, workspaceId);
        checkTaskEditPermission(task, currentUserId, currentRole);

        User currentUser = getUserById(currentUserId);

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getDeadline() != null) {
            task.setDeadline(request.getDeadline());
        }

        // Xử lý thay đổi assignee
        // null = không thay đổi; -1L = bỏ assignee; khác = gán mới
        if (request.getAssigneeId() != null) {
            if (request.getAssigneeId() == -1L) {
                task.setAssignee(null); // Unassign
            } else {
                User newAssignee = getUserById(request.getAssigneeId());
                validateAssigneeIsMember(task.getProject(), newAssignee);
                User oldAssignee = task.getAssignee();
                task.setAssignee(newAssignee);

                // Gửi notification khi thay đổi assignee
                if (oldAssignee == null || !oldAssignee.getId().equals(newAssignee.getId())) {
                    if (!newAssignee.getId().equals(currentUserId)) {
                        sendAssignNotification(task, currentUser);
                    }
                }
            }
        }

        Task saved = taskRepository.save(task);

        // Ghi ActivityLog: cập nhật task
        logActivity(ActionType.UPDATE_TASK, "Task", saved.getId(),
                "Cập nhật task \"" + saved.getTitle() + "\"", currentUser);

        return TaskResponse.from(saved);
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void deleteTask(Long taskId, Long currentUserId,
                           String currentRole, Long workspaceId) {
        Task task = getTaskInWorkspace(taskId, workspaceId);
        checkTaskEditPermission(task, currentUserId, currentRole);

        User currentUser = getUserById(currentUserId);

        // Ghi ActivityLog trước khi xóa
        logActivity(ActionType.DELETE_TASK, "Task", task.getId(),
                "Xóa task \"" + task.getTitle() + "\" khỏi project \""
                        + task.getProject().getName() + "\"", currentUser);

        taskRepository.delete(task);
    }

    // ─── Update Status (MEMBER, LEADER, WORKSPACE_ADMIN) ─────────────────────

    @Override
    @Transactional
    public TaskResponse updateTaskStatus(Long taskId, TaskStatus newStatus,
                                         Long currentUserId, String currentRole, Long workspaceId) {
        Task task = getTaskInWorkspace(taskId, workspaceId);
        User currentUser = getUserById(currentUserId);

        // MEMBER chỉ được cập nhật status task được gán cho mình
        if (RoleName.MEMBER.name().equals(currentRole)) {
            if (task.getAssignee() == null || !task.getAssignee().getId().equals(currentUserId)) {
                throw new AccessDeniedException("Bạn chỉ có thể cập nhật status của task được gán cho mình");
            }
        }

        TaskStatus oldStatus = task.getStatus();
        task.setStatus(newStatus);
        Task saved = taskRepository.save(task);

        // Ghi ActivityLog: thay đổi status
        logActivity(ActionType.CHANGE_TASK_STATUS, "Task", saved.getId(),
                "Cập nhật status task \"" + saved.getTitle() + "\": "
                        + oldStatus.name() + " → " + newStatus.name(), currentUser);

        return TaskResponse.from(saved);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Lấy project và kiểm tra phải thuộc workspaceId từ JWT.
     */
    private Project getProjectInWorkspace(Long projectId, Long workspaceId) {
        return projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Project không tồn tại hoặc không thuộc workspace của bạn"));
    }

    /**
     * Lấy task và kiểm tra phải thuộc workspaceId từ JWT (qua project → workspace).
     */
    private Task getTaskInWorkspace(Long taskId, Long workspaceId) {
        return taskRepository.findByIdAndWorkspaceId(taskId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Task không tồn tại hoặc không thuộc workspace của bạn"));
    }

    /**
     * Kiểm tra quyền sửa/xóa task:
     * - WORKSPACE_ADMIN: luôn được phép
     * - LEADER: chỉ được phép nếu là leader của project chứa task
     */
    private void checkTaskEditPermission(Task task, Long currentUserId, String currentRole) {
        if (RoleName.WORKSPACE_ADMIN.name().equals(currentRole)) {
            return;
        }
        Long leaderId = task.getProject().getLeader().getId();
        if (!leaderId.equals(currentUserId)) {
            throw new AccessDeniedException(
                    "Bạn chỉ có thể thao tác task trong project do mình quản lý");
        }
    }

    /**
     * Kiểm tra assignee phải là member của project.
     */
    private void validateAssigneeIsMember(Project project, User assignee) {
        boolean isMember = project.getMembers().stream()
                .anyMatch(m -> m.getId().equals(assignee.getId()));
        if (!isMember) {
            throw new IllegalArgumentException(
                    "User \"" + assignee.getUsername() + "\" không phải member của project này. "
                            + "Hãy thêm user vào project trước khi gán task.");
        }
    }

    /**
     * Gửi notification cho assignee khi được giao task.
     */
    private void sendAssignNotification(Task task, User assigner) {
        Notification notification = new Notification();
        notification.setUser(task.getAssignee());
        notification.setTask(task);
        notification.setContent(
                assigner.getUsername() + " đã giao task \""
                        + task.getTitle() + "\" cho bạn trong project \""
                        + task.getProject().getName() + "\"");
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    /**
     * Ghi ActivityLog cho một hành động.
     */
    private void logActivity(ActionType action, String targetType,
                              Long targetId, String description, User actor) {
        ActivityLog log = new ActivityLog();
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDescription(description);
        log.setUser(actor);
        activityLogRepository.save(log);
    }

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User không tồn tại: " + userId));
    }
}
