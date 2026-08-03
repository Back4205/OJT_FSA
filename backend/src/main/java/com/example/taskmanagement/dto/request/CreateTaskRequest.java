package com.example.taskmanagement.dto.request;

import com.example.taskmanagement.model.enums.TaskPriority;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Request DTO for creating a new task in a project.
 * Only LEADER or WORKSPACE_ADMIN can use this endpoint.
 */
@Getter
@Setter
public class CreateTaskRequest {

    @NotBlank(message = "Task title is required")
    @Size(max = 255, message = "Task title must not exceed 255 characters")
    private String title;

    private String description;

    @NotNull(message = "Priority is required")
    private TaskPriority priority;

    @Future(message = "Deadline must be in the future")
    private LocalDate deadline;

    @NotNull(message = "projectId is required")
    private Long projectId;

    // nullable: a task can remain unassigned
    private Long assigneeId;
}
