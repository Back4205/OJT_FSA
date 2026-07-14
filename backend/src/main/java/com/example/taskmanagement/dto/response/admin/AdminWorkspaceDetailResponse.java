package com.example.taskmanagement.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class AdminWorkspaceDetailResponse {
    private Long id;
    private String name;
    private String description;
    private boolean active;
    private long memberCount;
    private long activeMemberCount;
    private long workspaceAdminCount;
    private long leaderCount;
    private long regularMemberCount;
    private List<AdminMembershipResponse> memberships;
}
