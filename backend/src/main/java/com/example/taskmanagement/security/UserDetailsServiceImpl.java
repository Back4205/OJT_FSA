package com.example.taskmanagement.security;

import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.WorkspaceMembership;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.repository.WorkspaceMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;
    private final WorkspaceMembershipRepository workspaceMembershipRepository;

    @Override
    public UserDetails loadUserByUsername(String principal)
            throws UsernameNotFoundException {

        final String finalEmail;
        Long tempWorkspaceId = null;

        if (principal.contains(":")) {
            String[] parts = principal.split(":");
            finalEmail = parts[0];
            if (!parts[1].equals("null")) {
                tempWorkspaceId = Long.parseLong(parts[1]);
            }
        } else {
            finalEmail = principal;
        }

        final Long workspaceId = tempWorkspaceId;

        User user = userRepository.findByEmail(finalEmail)
                .orElseGet(() -> userRepository.findByUsername(finalEmail)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal)));

        String activeRole = user.isSuperAdmin() ? com.example.taskmanagement.model.enums.RoleName.SUPER_ADMIN.name() : com.example.taskmanagement.model.enums.RoleName.MEMBER.name(); // global fallback role
        boolean isUserDisabled = !user.isActive();

        // If a workspace context is present, query membership inside the workspace
        if (workspaceId != null && !user.isSuperAdmin()) {
            WorkspaceMembership membership = workspaceMembershipRepository.findByUserIdAndWorkspaceId(user.getId(), workspaceId)
                    .orElseThrow(() -> new UsernameNotFoundException("User is not a member of active workspace: " + workspaceId));
            
            activeRole = membership.getRole().getName().name();
            if (!membership.isActive() || !membership.getWorkspace().isActive()) {
                isUserDisabled = true;
            }
        }

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword() != null ? user.getPassword() : "")
                .roles(activeRole)
                .disabled(isUserDisabled)
                .build();
    }
}