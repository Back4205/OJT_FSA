package com.example.taskmanagement.dto.request;

import com.example.taskmanagement.model.enums.TaskPriority;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Request DTO for updating a task.
 * All fields are optional; only non-null fields are updated.
 */
@Getter
@Setter
public class UpdateTaskRequest {

    @Size(max = 255, message = "Task title must not exceed 255 characters")
    private String title;

    private String description;

    private TaskPriority priority;

    private LocalDate deadline;

    // null = keep assignee; -1 = remove assignee (unassign)
    private Long assigneeId;
}
