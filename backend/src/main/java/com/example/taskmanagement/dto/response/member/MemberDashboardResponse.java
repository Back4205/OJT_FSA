package com.example.taskmanagement.dto.response.member;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberDashboardResponse {
    private Long userId;
    private String username;
    private String email;
    private Long workspaceId;
    private String workspaceName;
    private String role;
    private long totalAssignedTasks;
    private long completedTasks;
    private long inProgressTasks;
    private long dueSoonTasks;
    private long overdueTasks;
    private List<MemberTaskResponse> tasks;
    private List<MemberActivityResponse> activities;
}
