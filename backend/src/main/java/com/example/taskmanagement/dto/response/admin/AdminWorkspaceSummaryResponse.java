package com.example.taskmanagement.dto.response.admin;

import com.example.taskmanagement.model.Workspace;
import com.example.taskmanagement.model.WorkspaceMembership;
import com.example.taskmanagement.model.enums.RoleName;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class AdminWorkspaceSummaryResponse {
    private Long id;
    private String name;
    private String description;
    private boolean active;
    private long memberCount;
    private long workspaceAdminCount;
    private long leaderCount;
    private long regularMemberCount;
    private long totalTaskCount;
    private long completedTaskCount;
    private int progressPercent;
    private List<String> participantInitials;
    private LocalDateTime createdAt;

    public static AdminWorkspaceSummaryResponse fromEntity(
            Workspace workspace,
            List<WorkspaceMembership> memberships,
            long totalTaskCount,
            long completedTaskCount
    ) {
        long activeMemberCount = memberships.stream().filter(WorkspaceMembership::isActive).count();
        long workspaceAdminCount = countActiveRole(memberships, RoleName.WORKSPACE_ADMIN);
        long leaderCount = countActiveRole(memberships, RoleName.LEADER);
        long regularMemberCount = countActiveRole(memberships, RoleName.MEMBER);
        int progressPercent = totalTaskCount == 0
                ? 0
                : (int) Math.round((completedTaskCount * 100.0) / totalTaskCount);
        List<String> participantInitials = memberships.stream()
                .filter(WorkspaceMembership::isActive)
                .limit(4)
                .map(membership -> initials(membership.getUser().getUsername(), membership.getUser().getEmail()))
                .toList();

        return new AdminWorkspaceSummaryResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.isActive(),
                activeMemberCount,
                workspaceAdminCount,
                leaderCount,
                regularMemberCount,
                totalTaskCount,
                completedTaskCount,
                progressPercent,
                participantInitials,
                workspace.getCreatedAt()
        );
    }

    private static long countActiveRole(List<WorkspaceMembership> memberships, RoleName roleName) {
        return memberships.stream()
                .filter(WorkspaceMembership::isActive)
                .filter(membership -> membership.getRole() != null && membership.getRole().getName() == roleName)
                .count();
    }

    private static String initials(String username, String email) {
        String source = username != null && !username.isBlank() ? username : email;
        if (source == null || source.isBlank()) {
            return "?";
        }
        String[] parts = source.trim().split("\\s+");
        if (parts.length > 1) {
            return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
        }
        return source.substring(0, Math.min(2, source.length())).toUpperCase();
    }
}
