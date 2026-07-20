package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.Project;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.stream.Collectors;

/**
 * @author Vương Bách
 * Response DTO cho thông tin chi tiết của một Project,
 * bao gồm danh sách members và tasks.
 */
@Getter
@Setter
public class ProjectDetailResponse {

    private Long id;
    private String name;
    private String description;
    private Long leaderId;
    private String leaderUsername;
    private Long workspaceId;
    private String workspaceName;
    private List<MemberResponse> members;
    private List<TaskResponse> tasks;

    public static ProjectDetailResponse from(Project project, List<MemberResponse> members) {
        ProjectDetailResponse dto = new ProjectDetailResponse();
        dto.setId(project.getId());
        dto.setName(project.getName());
        dto.setDescription(project.getDescription());
        dto.setLeaderId(project.getLeader().getId());
        dto.setLeaderUsername(project.getLeader().getUsername());
        dto.setWorkspaceId(project.getWorkspace().getId());
        dto.setWorkspaceName(project.getWorkspace().getName());
        dto.setMembers(members);
        dto.setTasks(
            project.getTasks().stream()
                .map(TaskResponse::from)
                .collect(Collectors.toList())
        );
        return dto;
    }
}
