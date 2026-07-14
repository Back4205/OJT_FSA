package com.example.taskmanagement.dto.request.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminWorkspaceUpdateRequest {

    @NotBlank(message = "Workspace name is required")
    private String name;

    private String description;
}
