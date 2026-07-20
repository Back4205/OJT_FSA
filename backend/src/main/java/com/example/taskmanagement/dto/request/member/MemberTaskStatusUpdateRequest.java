package com.example.taskmanagement.dto.request.member;

import com.example.taskmanagement.model.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemberTaskStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private TaskStatus status;
}
