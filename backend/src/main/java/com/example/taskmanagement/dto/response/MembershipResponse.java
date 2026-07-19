package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.WorkspaceMembership;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.ArrayList;

@Getter
@Setter
@AllArgsConstructor
public class MembershipResponse {
    private Long id;
    private Long userId;
    private String username;
    private String email;
    private String roleName;
    private boolean active;
    private List<String> projects;

    public static MembershipResponse fromEntity(WorkspaceMembership membership) {
        return new MembershipResponse(
                membership.getId(),
                membership.getUser().getId(),
                membership.getUser().getUsername(),
                membership.getUser().getEmail(),
                membership.getRole().getName().name(),
                membership.isActive(),
                new ArrayList<>()
        );
    }

    public static MembershipResponse fromEntity(WorkspaceMembership membership, List<String> projects) {
        return new MembershipResponse(
                membership.getId(),
                membership.getUser().getId(),
                membership.getUser().getUsername(),
                membership.getUser().getEmail(),
                membership.getRole().getName().name(),
                membership.isActive(),
                projects
        );
    }
}
