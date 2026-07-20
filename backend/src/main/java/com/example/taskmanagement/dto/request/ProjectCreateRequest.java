package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectCreateRequest {
    @NotBlank(message = "Tên project không được trống")
    private String name;

    private String description;

    @NotNull(message = "Người dẫn dắt (Leader) không được trống")
    private Long leaderId;
}
