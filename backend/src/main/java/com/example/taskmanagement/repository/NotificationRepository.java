package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserId(Long userId);
    List<Notification> findByUserIdOrderByTimestampDesc(Long userId);
    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT n FROM Notification n WHERE n.user.id = :userId OR " +
        "(n.task IS NOT NULL AND n.task.project.workspace.id = :workspaceId) " +
        "ORDER BY n.timestamp DESC"
    )
    List<Notification> findByUserIdOrWorkspaceIdOrderByTimestampDesc(
        @org.springframework.data.repository.query.Param("userId") Long userId,
        @org.springframework.data.repository.query.Param("workspaceId") Long workspaceId
    );
}
