package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserId(Long userId);
    List<Notification> findByUserIdOrderByTimestampDesc(Long userId);
    Optional<Notification> findByIdAndUserId(Long id, Long userId);
}
