package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemberRoleUpdateRequest {
    @NotBlank(message = "Vai trò không được trống")
    private String roleName; // E.g. LEADER, MEMBER
}
