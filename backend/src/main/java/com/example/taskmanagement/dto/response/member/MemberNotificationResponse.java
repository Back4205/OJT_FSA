package com.example.taskmanagement.dto.response.member;

import com.example.taskmanagement.model.Notification;
import com.example.taskmanagement.model.Task;
import com.example.taskmanagement.model.enums.TaskPriority;
import com.example.taskmanagement.model.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberNotificationResponse {
    private Long id;
    private String content;
    private boolean read;
    private LocalDateTime timestamp;
    private Long taskId;
    private String taskTitle;
    private String projectName;
    private TaskPriority priority;
    private TaskStatus status;
    private LocalDate deadline;

    public static MemberNotificationResponse fromEntity(Notification notification) {
        Task task = notification.getTask();
        return MemberNotificationResponse.builder()
                .id(notification.getId())
                .content(notification.getContent())
                .read(notification.isRead())
                .timestamp(notification.getTimestamp())
                .taskId(task != null ? task.getId() : null)
                .taskTitle(task != null ? task.getTitle() : null)
                .projectName(task != null && task.getProject() != null ? task.getProject().getName() : null)
                .priority(task != null ? task.getPriority() : null)
                .status(task != null ? task.getStatus() : null)
                .deadline(task != null ? task.getDeadline() : null)
                .build();
    }
}
