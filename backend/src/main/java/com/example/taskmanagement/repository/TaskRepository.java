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

/**
 * @author Vương Bách
 */
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);

    Page<Task> findByProjectId(Long projectId, Pageable pageable);

    List<Task> findByProjectIdAndStatus(Long projectId, TaskStatus status);

    List<Task> findByProjectIdAndPriority(Long projectId, TaskPriority priority);

    List<Task> findByProjectIdAndAssigneeId(Long projectId, Long assigneeId);

    Optional<Task> findByIdAndProjectId(Long id, Long projectId);

    /**
     * Tìm task theo projectId với filter động (status và priority có thể null)
     */
    @Query("SELECT t FROM Task t WHERE t.project.id = :projectId " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:priority IS NULL OR t.priority = :priority)")
    Page<Task> findByProjectIdWithFilters(@Param("projectId") Long projectId,
                                          @Param("status") TaskStatus status,
                                          @Param("priority") TaskPriority priority,
                                          Pageable pageable);

    /**
     * Kiểm tra task có thuộc workspace không (qua project → workspace)
     */
    @Query("SELECT t FROM Task t WHERE t.id = :taskId AND t.project.workspace.id = :workspaceId")
    Optional<Task> findByIdAndWorkspaceId(@Param("taskId") Long taskId,
                                          @Param("workspaceId") Long workspaceId);
}
