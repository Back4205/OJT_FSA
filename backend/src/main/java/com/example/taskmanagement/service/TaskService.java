package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.CreateTaskRequest;
import com.example.taskmanagement.dto.request.UpdateTaskRequest;
import com.example.taskmanagement.dto.response.TaskResponse;
import com.example.taskmanagement.model.enums.TaskPriority;
import com.example.taskmanagement.model.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * @author Vương Bách
 * Service interface cho các thao tác quản lý Task.
 */
public interface TaskService {

    /**
     * Tạo task mới trong một project.
     * Project phải thuộc workspaceId trong JWT.
     * Nếu có assigneeId, user đó phải là member của project.
     */
    TaskResponse createTask(CreateTaskRequest request, Long currentUserId, Long workspaceId);

    /**
     * Lấy danh sách tasks của một project với filter và pagination.
     * Project phải thuộc workspaceId trong JWT.
     */
    Page<TaskResponse> getTasksByProject(Long projectId, Long workspaceId,
                                         TaskStatus statusFilter, TaskPriority priorityFilter,
                                         Pageable pageable);

    /**
     * Lấy chi tiết một task.
     * Task phải thuộc workspaceId trong JWT.
     */
    TaskResponse getTaskById(Long taskId, Long workspaceId);

    /**
     * Cập nhật thông tin task (LEADER của project hoặc WORKSPACE_ADMIN).
     * Nếu thay đổi assigneeId, user mới phải là member của project.
     */
    TaskResponse updateTask(Long taskId, UpdateTaskRequest request,
                            Long currentUserId, String currentRole, Long workspaceId);

    /**
     * Xóa task (LEADER của project hoặc WORKSPACE_ADMIN).
     */
    void deleteTask(Long taskId, Long currentUserId, String currentRole, Long workspaceId);

    /**
     * Cập nhật status của task.
     * Được gọi bởi MEMBER (assignee), LEADER, hoặc WORKSPACE_ADMIN.
     * Trạng thái có thể chuyển linh hoạt: TODO ↔ IN_PROGRESS ↔ REVIEW ↔ DONE.
     */
    TaskResponse updateTaskStatus(Long taskId, TaskStatus newStatus,
                                  Long currentUserId, String currentRole, Long workspaceId);
}
