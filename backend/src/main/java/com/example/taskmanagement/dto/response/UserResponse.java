package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.enums.AuthProvider;
import com.example.taskmanagement.model.enums.RoleName;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * @author Vương Bách
 * Trả về FE - KHÔNG bao giờ chứa password.
 */
@Getter
@Setter
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private RoleName role;
    private AuthProvider provider;
    private boolean active;
    private Long workspaceId;
    private String workspaceName;

    public static UserResponse fromEntity(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.isSuperAdmin() ? RoleName.SUPER_ADMIN : RoleName.MEMBER,
                user.getProvider(),
                user.isActive(),
                null,
                null
        );
    }

    public static UserResponse fromEntity(User user, com.example.taskmanagement.model.Workspace workspace, com.example.taskmanagement.model.Role role) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                role != null ? role.getName() : (user.isSuperAdmin() ? RoleName.SUPER_ADMIN : RoleName.MEMBER),
                user.getProvider(),
                user.isActive(),
                workspace != null ? workspace.getId() : null,
                workspace != null ? workspace.getName() : null
        );
    }
}