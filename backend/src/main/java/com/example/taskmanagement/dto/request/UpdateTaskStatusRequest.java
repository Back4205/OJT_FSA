package com.example.taskmanagement.dto.request;

import com.example.taskmanagement.model.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO for updating a task status.
 * MEMBER, LEADER, and WORKSPACE_ADMIN can use it.
 * Valid statuses: TODO -> IN_PROGRESS -> REVIEW -> DONE.
 */
@Getter
@Setter
public class UpdateTaskStatusRequest {

    @NotNull(message = "Status is required")
    private TaskStatus status;
}
