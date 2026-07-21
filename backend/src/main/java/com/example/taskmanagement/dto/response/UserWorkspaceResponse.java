package com.example.taskmanagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class UserWorkspaceResponse {
    private Long workspaceId;
    private String workspaceName;
    private String roleName;
    private Long uncompletedTaskCount;
    private Long completedTaskCount;
    private List<CompletedTaskInfo> completedTasks;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class CompletedTaskInfo {
        private Long id;
        private String title;
        private String projectName;
        private String priority;
        private String deadline;
    }
}
