package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.Workspace;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class WorkspaceResponse {
    private Long id;
    private String name;
    private String description;
    private boolean active;
    private String inviteCode;

    public static WorkspaceResponse fromEntity(Workspace workspace) {
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.isActive(),
                workspace.getInviteCode()
        );
    }
}
