package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.enums.RoleName;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * @author Vương Bách
 * Response DTO cho thông tin một member trong Project hoặc Workspace.
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
