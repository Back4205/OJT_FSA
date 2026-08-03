package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO for adding a workspace member to a project.
 */
@Getter
@Setter
public class AddProjectMemberRequest {

    @NotNull(message = "memberId is required")
    private Long memberId; // userId to add to the project
}
