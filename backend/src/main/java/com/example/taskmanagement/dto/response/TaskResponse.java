package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.Task;
import com.example.taskmanagement.model.enums.TaskPriority;
import com.example.taskmanagement.model.enums.TaskStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * @author Vương Bách
 * Response DTO cho Task.
 */
@Getter
@Setter
public class TaskResponse {

    private Long id;
    private String title;
    private String description;
    private TaskPriority priority;
    private TaskStatus status;
    private LocalDate deadline;
    private Long projectId;
    private String projectName;
    private Long assigneeId;
    private String assigneeUsername;

    public static TaskResponse from(Task task) {
        TaskResponse dto = new TaskResponse();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setPriority(task.getPriority());
        dto.setStatus(task.getStatus());
        dto.setDeadline(task.getDeadline());
        dto.setProjectId(task.getProject().getId());
        dto.setProjectName(task.getProject().getName());
        if (task.getAssignee() != null) {
            dto.setAssigneeId(task.getAssignee().getId());
            dto.setAssigneeUsername(task.getAssignee().getUsername());
        }
        return dto;
    }
}
