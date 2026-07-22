package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByUserId(Long userId);

    @Query(
        "SELECT a FROM ActivityLog a WHERE a.timestamp >= :start AND a.timestamp < :end " +
        "AND a.targetType = 'Task' " +
        "AND EXISTS (SELECT t FROM Task t WHERE t.id = a.targetId AND t.project.workspace.id = :workspaceId AND (t.project.isDeleted IS NULL OR t.project.isDeleted = false))"
    )
    List<ActivityLog> findTaskActivitiesInWorkspaceThisWeek(
        @Param("workspaceId") Long workspaceId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );
}
