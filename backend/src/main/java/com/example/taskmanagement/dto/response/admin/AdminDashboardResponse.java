package com.example.taskmanagement.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class AdminDashboardResponse {
    private long totalUsers;
    private long activeUsers;
    private long lockedUsers;
    private long superAdmins;
    private long totalWorkspaces;
    private long activeWorkspaces;
    private long lockedWorkspaces;
    private long totalMemberships;
    private long activeMemberships;
    private List<AdminWeeklyActivityResponse> weeklyActivity;
}
