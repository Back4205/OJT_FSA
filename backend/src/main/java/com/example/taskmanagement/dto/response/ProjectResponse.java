package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.Project;
import com.example.taskmanagement.model.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@AllArgsConstructor
public class ProjectResponse {
    private Long id;
    private String name;
    private String description;
    private Long leaderId;
    private String leaderUsername;
    private String leaderEmail;
    private Long workspaceId;
    private List<UserSummaryResponse> members;
    private int taskCount;
    private int completedTaskCount;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class UserSummaryResponse {
        private Long id;
        private String username;
        private String email;
    }

    /** Alias for fromEntity() — kept for backward compatibility with ProjectServiceImpl. */
    public static ProjectResponse from(Project project) {
        return fromEntity(project);
    }

    public static ProjectResponse fromEntity(Project project) {
        List<UserSummaryResponse> memberList = project.getMembers().stream()
                .map(m -> new UserSummaryResponse(m.getId(), m.getUsername(), m.getEmail()))
                .collect(Collectors.toList());

        int taskCount = project.getTasks() != null ? project.getTasks().size() : 0;
        int completedTaskCount = project.getTasks() != null
                ? (int) project.getTasks().stream()
                    .filter(t -> t.getStatus() == TaskStatus.DONE)
                    .count()
                : 0;

        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getLeader().getId(),
                project.getLeader().getUsername(),
                project.getLeader().getEmail(),
                project.getWorkspace().getId(),
                memberList,
                taskCount,
                completedTaskCount
        );
    }
}
