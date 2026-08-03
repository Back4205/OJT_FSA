package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.enums.RoleName;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * Response DTO for a member in a project or workspace.
 */
@Getter
@Setter
@AllArgsConstructor
public class MemberResponse {

    private Long userId;
    private String username;
    private String email;
    private RoleName roleInWorkspace;
}
