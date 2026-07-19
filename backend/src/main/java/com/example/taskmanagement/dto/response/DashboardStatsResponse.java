package com.example.taskmanagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    private long totalProjects;
    private long totalMembers;
    private long totalTasks;
    private Map<String, Long> tasksByStatus;
    private Map<String, Long> tasksByPriority;
}
