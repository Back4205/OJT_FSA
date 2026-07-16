package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.Project;
import lombok.Getter;
import lombok.Setter;

/**
 * @author Vương Bách
 * Response DTO cho thông tin tóm tắt của một Project (dùng trong danh sách).
 */
@Getter
@Setter
public class ProjectResponse {

    private Long id;
    private String name;
    private String description;
    private Long leaderId;
    private String leaderUsername;
    private Long workspaceId;
    private String workspaceName;
    private int memberCount;
    private int taskCount;

    public static ProjectResponse from(Project project) {
        ProjectResponse dto = new ProjectResponse();
        dto.setId(project.getId());
        dto.setName(project.getName());
        dto.setDescription(project.getDescription());
        dto.setLeaderId(project.getLeader().getId());
        dto.setLeaderUsername(project.getLeader().getUsername());
        dto.setWorkspaceId(project.getWorkspace().getId());
        dto.setWorkspaceName(project.getWorkspace().getName());
        dto.setMemberCount(project.getMembers().size());
        dto.setTaskCount(project.getTasks().size());
        return dto;
    }
}
