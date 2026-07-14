package com.example.taskmanagement.dto.response.admin;

import com.example.taskmanagement.model.WorkspaceMembership;
import com.example.taskmanagement.model.enums.RoleName;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class AdminMembershipResponse {
    private Long membershipId;
    private Long userId;
    private String username;
    private String email;
    private Long workspaceId;
    private String workspaceName;
    private RoleName role;
    private boolean active;

    public static AdminMembershipResponse fromEntity(WorkspaceMembership membership) {
        return new AdminMembershipResponse(
                membership.getId(),
                membership.getUser().getId(),
                membership.getUser().getUsername(),
                membership.getUser().getEmail(),
                membership.getWorkspace().getId(),
                membership.getWorkspace().getName(),
                membership.getRole().getName(),
                membership.isActive()
        );
    }
}
