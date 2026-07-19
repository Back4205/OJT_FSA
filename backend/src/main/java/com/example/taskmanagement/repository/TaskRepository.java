package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.Task;
import com.example.taskmanagement.model.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectId(Long projectId);
    long countByProjectWorkspaceId(Long workspaceId);
    long countByProjectWorkspaceIdAndStatus(Long workspaceId, TaskStatus status);
    long countByProjectWorkspaceIdAndPriority(Long workspaceId, com.example.taskmanagement.model.enums.TaskPriority priority);
}
