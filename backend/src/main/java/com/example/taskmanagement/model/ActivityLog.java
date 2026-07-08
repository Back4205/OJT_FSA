package com.example.taskmanagement.model;

import com.example.taskmanagement.model.enums.ActionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * @author Vương Bách
 */
@Entity
@Table(name = "activity_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ActivityLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ActionType action;

    // VD: "Task", "Project", "User" - loại đối tượng bị tác động
    @Column(name = "target_type", length = 30)
    private String targetType;

    // id của đối tượng bị tác động (taskId, projectId,...)
    @Column(name = "target_id")
    private Long targetId;

    @Column(columnDefinition = "NVARCHAR(500)")
    private String description;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    // Người thực hiện hành động
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Tự động set thời gian hiện tại khi lưu log xuống DB
    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}