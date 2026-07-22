package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.ActivityLog;
import com.example.taskmanagement.model.enums.ActionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Collection;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByUserId(Long userId);
    List<ActivityLog> findByActionAndTargetTypeAndTargetIdInAndTimestampBetween(
            ActionType action,
            String targetType,
            Collection<Long> targetIds,
            LocalDateTime start,
            LocalDateTime end
    );
}
