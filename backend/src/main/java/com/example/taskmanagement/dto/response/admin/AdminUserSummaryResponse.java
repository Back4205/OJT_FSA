package com.example.taskmanagement.dto.response.admin;

import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.enums.AuthProvider;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class AdminUserSummaryResponse {
    private Long id;
    private String username;
    private String email;
    private AuthProvider provider;
    private boolean active;
    private boolean superAdmin;
    private boolean emailVerified;
    private long membershipCount;

    public static AdminUserSummaryResponse fromEntity(User user, long membershipCount) {
        return new AdminUserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getProvider(),
                user.isActive(),
                user.isSuperAdmin(),
                user.isEmailVerified(),
                membershipCount
        );
    }
}
