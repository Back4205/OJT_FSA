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

    public static UserResponse fromEntity(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().getName(),
                user.getProvider(),
                user.isActive()
        );
    }
}