package com.example.taskmanagement.dto.response.member;

import com.example.taskmanagement.model.Notification;
import com.example.taskmanagement.model.Task;
import com.example.taskmanagement.model.Workspace;
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
    private String workspaceName;
    private TaskPriority priority;
    private TaskStatus status;
    private LocalDate deadline;

    public static MemberNotificationResponse fromEntity(Notification notification) {
        return fromEntity(notification, null);
    }

    public static MemberNotificationResponse fromEntity(Notification notification, Long currentUserId) {
        Task task = notification.getTask();
        Workspace workspace = notification.getWorkspace();
        if (workspace == null && task != null && task.getProject() != null) {
            workspace = task.getProject().getWorkspace();
        }
        String content = notification.getContent();
        if (currentUserId != null && notification.getUser() != null && !notification.getUser().getId().equals(currentUserId)) {
            content = content.replace("cho bạn", "cho " + notification.getUser().getUsername());
        }
        return MemberNotificationResponse.builder()
                .id(notification.getId())
                .content(content)
                .read(notification.isRead())
                .timestamp(notification.getTimestamp())
                .taskId(task != null ? task.getId() : null)
                .taskTitle(task != null ? task.getTitle() : null)
                .projectName(task != null && task.getProject() != null ? task.getProject().getName() : null)
                .workspaceName(workspace != null ? workspace.getName() : null)
                .priority(task != null ? task.getPriority() : null)
                .status(task != null ? task.getStatus() : null)
                .deadline(task != null ? task.getDeadline() : null)
                .build();
    }
}
