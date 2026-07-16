package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * @author Vương Bách
 */
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findByTargetTypeAndTargetIdOrderByTimestampDesc(String targetType, Long targetId);

    Page<ActivityLog> findByUserIdOrderByTimestampDesc(Long userId, Pageable pageable);
}
