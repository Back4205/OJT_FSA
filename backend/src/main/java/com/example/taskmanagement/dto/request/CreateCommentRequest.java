package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateCommentRequest {
    @NotNull(message = "Task ID is required")
    private Long taskId;

    @NotBlank(message = "Content cannot be empty")
    private String content;
}
