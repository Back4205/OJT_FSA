package com.example.taskmanagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class UserWorkspaceResponse {
    private Long workspaceId;
    private String workspaceName;
    private String roleName;
}
