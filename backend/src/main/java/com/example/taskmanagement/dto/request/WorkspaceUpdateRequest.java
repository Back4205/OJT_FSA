package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WorkspaceUpdateRequest {
    @NotBlank(message = "Workspace name is required")
    private String name;

    private String description;
}
