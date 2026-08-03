package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectCreateRequest {
    @NotBlank(message = "Project name is required")
    private String name;

    private String description;

    @NotNull(message = "Project leader is required")
    private Long leaderId;

    @NotNull(message = "Member limit is required")
    @Min(value = 1, message = "Maximum member count must be at least 1")
    private Integer maxMembers;
}
