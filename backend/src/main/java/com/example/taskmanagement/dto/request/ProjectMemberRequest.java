package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectMemberRequest {
    @NotNull(message = "ID của user không được để trống")
    private Long userId;
}
