package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.Task;
import com.example.taskmanagement.model.enums.TaskPriority;
import com.example.taskmanagement.model.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);

    long countByProjectWorkspaceId(Long workspaceId);

    long countByProjectWorkspaceIdAndStatus(Long workspaceId, TaskStatus status);

    long countByProjectWorkspaceIdAndPriority(Long workspaceId, TaskPriority priority);

    /**
     * Lấy task theo workspaceId (thông qua project → workspace).
     * Dùng để kiểm tra task thuộc đúng workspace từ JWT.
     */
    @Query("SELECT t FROM Task t WHERE t.id = :taskId AND t.project.workspace.id = :workspaceId")
    Optional<Task> findByIdAndWorkspaceId(@Param("taskId") Long taskId,
                                          @Param("workspaceId") Long workspaceId);

    /**
     * Lấy danh sách task của project với filter tùy chọn theo status và/hoặc priority.
     * Nếu filter = null thì bỏ qua điều kiện đó.
     */
    @Query("SELECT t FROM Task t WHERE t.project.id = :projectId " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:priority IS NULL OR t.priority = :priority)")
    Page<Task> findByProjectIdWithFilters(@Param("projectId") Long projectId,
                                          @Param("status") TaskStatus status,
                                          @Param("priority") TaskPriority priority,
                                          Pageable pageable);
}
