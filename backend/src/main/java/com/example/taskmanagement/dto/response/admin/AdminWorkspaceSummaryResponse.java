package com.example.taskmanagement.dto.response.admin;

import com.example.taskmanagement.model.Workspace;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class AdminWorkspaceSummaryResponse {
    private Long id;
    private String name;
    private String description;
    private boolean active;
    private long memberCount;

    public static AdminWorkspaceSummaryResponse fromEntity(Workspace workspace, long memberCount) {
        return new AdminWorkspaceSummaryResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.isActive(),
                memberCount
        );
    }
}
