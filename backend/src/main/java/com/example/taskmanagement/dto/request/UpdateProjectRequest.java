package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO for updating project information.
 * All fields are optional; only non-null fields are updated.
 */
@Getter
@Setter
public class UpdateProjectRequest {

    @Size(max = 255, message = "Project name must not exceed 255 characters")
    private String name;

    private String description;
}
