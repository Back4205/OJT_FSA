package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemberRoleUpdateRequest {
    @NotBlank(message = "Role is required")
    private String roleName; // E.g. LEADER, MEMBER
}
