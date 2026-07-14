package com.example.taskmanagement.dto.response.admin;

import com.example.taskmanagement.model.enums.AuthProvider;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class AdminUserDetailResponse {
    private Long id;
    private String username;
    private String email;
    private AuthProvider provider;
    private boolean active;
    private boolean superAdmin;
    private boolean emailVerified;
    private long membershipCount;
    private long activeMembershipCount;
    private List<AdminMembershipResponse> memberships;
}
