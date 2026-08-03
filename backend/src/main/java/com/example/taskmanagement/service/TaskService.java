package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.CreateTaskRequest;
import com.example.taskmanagement.dto.request.UpdateTaskRequest;
import com.example.taskmanagement.dto.response.TaskResponse;
import com.example.taskmanagement.model.enums.TaskPriority;
import com.example.taskmanagement.model.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**

 */
public interface TaskService {

    /**

     */
    TaskResponse createTask(CreateTaskRequest request, Long currentUserId, Long workspaceId);

    /**

     */
    Page<TaskResponse> getTasksByProject(Long projectId, Long workspaceId,
                                         TaskStatus statusFilter, TaskPriority priorityFilter,
                                         Pageable pageable);

    /**

     */
    TaskResponse getTaskById(Long taskId, Long workspaceId);

    /**

     */
    TaskResponse updateTask(Long taskId, UpdateTaskRequest request,
                            Long currentUserId, String currentRole, Long workspaceId);

    /**

     */
    void deleteTask(Long taskId, Long currentUserId, String currentRole, Long workspaceId);

    /**

     */
    TaskResponse updateTaskStatus(Long taskId, TaskStatus newStatus,
                                  Long currentUserId, String currentRole, Long workspaceId);
}
