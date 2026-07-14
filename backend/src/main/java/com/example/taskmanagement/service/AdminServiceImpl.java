package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.admin.AdminWorkspaceUpdateRequest;
import com.example.taskmanagement.dto.response.PageResponse;
import com.example.taskmanagement.dto.response.admin.AdminDashboardResponse;
import com.example.taskmanagement.dto.response.admin.AdminMembershipResponse;
import com.example.taskmanagement.dto.response.admin.AdminUserDetailResponse;
import com.example.taskmanagement.dto.response.admin.AdminUserSummaryResponse;
import com.example.taskmanagement.dto.response.admin.AdminWorkspaceDetailResponse;
import com.example.taskmanagement.dto.response.admin.AdminWorkspaceSummaryResponse;
import com.example.taskmanagement.model.Role;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.Workspace;
import com.example.taskmanagement.model.WorkspaceMembership;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.repository.RoleRepository;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.repository.WorkspaceMembershipRepository;
import com.example.taskmanagement.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMembershipRepository workspaceMembershipRepository;
    private final RoleRepository roleRepository;

    @Override
    public AdminDashboardResponse getDashboard() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByIsActiveTrue();
        long lockedUsers = userRepository.countByIsActiveFalse();
        long superAdmins = userRepository.countByIsSuperAdminTrue();
        long totalWorkspaces = workspaceRepository.count();
        long activeWorkspaces = workspaceRepository.countByActiveTrue();
        long lockedWorkspaces = workspaceRepository.countByActiveFalse();
        long totalMemberships = workspaceMembershipRepository.count();
        long activeMemberships = workspaceMembershipRepository.countActiveMemberships();

        return new AdminDashboardResponse(
                totalUsers,
                activeUsers,
                lockedUsers,
                superAdmins,
                totalWorkspaces,
                activeWorkspaces,
                lockedWorkspaces,
                totalMemberships,
                activeMemberships
        );
    }

    @Override
    public PageResponse<AdminUserSummaryResponse> getUsers(String search, Boolean active, Boolean superAdmin, Pageable pageable) {
        Page<User> page = userRepository.searchAdminUsers(normalize(search), active, superAdmin, pageable);
        Page<AdminUserSummaryResponse> mapped = page.map(user ->
                AdminUserSummaryResponse.fromEntity(user, workspaceMembershipRepository.countByUserId(user.getId())));
        return PageResponse.fromPage(mapped);
    }

    @Override
    public AdminUserDetailResponse getUser(Long userId) {
        User user = loadUser(userId);
        List<WorkspaceMembership> memberships = workspaceMembershipRepository.findByUserId(userId);
        List<AdminMembershipResponse> mappedMemberships = memberships.stream()
                .map(AdminMembershipResponse::fromEntity)
                .toList();

        return new AdminUserDetailResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getProvider(),
                user.isActive(),
                user.isSuperAdmin(),
                user.isEmailVerified(),
                workspaceMembershipRepository.countByUserId(userId),
                workspaceMembershipRepository.countActiveByUserId(userId),
                mappedMemberships
        );
    }

    @Override
    @Transactional
    public AdminUserSummaryResponse lockUser(Long userId) {
        return setUserActive(userId, false);
    }

    @Override
    @Transactional
    public AdminUserSummaryResponse unlockUser(Long userId) {
        return setUserActive(userId, true);
    }

    @Override
    @Transactional
    public AdminUserSummaryResponse setSuperAdmin(Long userId, boolean enabled, String actorEmail) {
        User user = loadUser(userId);
        if (user.isSuperAdmin() == enabled) {
            return AdminUserSummaryResponse.fromEntity(user, workspaceMembershipRepository.countByUserId(user.getId()));
        }

        if (!enabled && user.isSuperAdmin() && userRepository.countByIsSuperAdminTrue() <= 1) {
            throw new IllegalStateException("At least one SUPER_ADMIN must remain active");
        }

        if (!enabled && actorEmail != null && actorEmail.equalsIgnoreCase(user.getEmail()) && userRepository.countByIsSuperAdminTrue() <= 1) {
            throw new IllegalStateException("You cannot remove the last SUPER_ADMIN from your own account");
        }

        user.setSuperAdmin(enabled);
        userRepository.save(user);
        return AdminUserSummaryResponse.fromEntity(user, workspaceMembershipRepository.countByUserId(user.getId()));
    }

    @Override
    public PageResponse<AdminMembershipResponse> getUserMemberships(Long userId, Pageable pageable) {
        loadUser(userId);
        Page<WorkspaceMembership> memberships = workspaceMembershipRepository.findByUser_Id(userId, pageable);
        return PageResponse.fromPage(memberships.map(AdminMembershipResponse::fromEntity));
    }

    @Override
    public PageResponse<AdminWorkspaceSummaryResponse> getWorkspaces(String search, Boolean active, Pageable pageable) {
        Page<Workspace> page = workspaceRepository.searchAdminWorkspaces(normalize(search), active, pageable);
        Page<AdminWorkspaceSummaryResponse> mapped = page.map(workspace ->
                AdminWorkspaceSummaryResponse.fromEntity(workspace,
                        workspaceMembershipRepository.countActiveByWorkspaceId(workspace.getId())));
        return PageResponse.fromPage(mapped);
    }

    @Override
    public AdminWorkspaceDetailResponse getWorkspace(Long workspaceId) {
        Workspace workspace = loadWorkspace(workspaceId);
        List<WorkspaceMembership> memberships = workspaceMembershipRepository.findByWorkspaceId(workspaceId);
        List<AdminMembershipResponse> mappedMemberships = memberships.stream()
                .map(AdminMembershipResponse::fromEntity)
                .toList();

        long activeMembers = memberships.stream().filter(WorkspaceMembership::isActive).count();
        long workspaceAdminCount = memberships.stream()
                .filter(WorkspaceMembership::isActive)
                .filter(membership -> membership.getRole() != null && membership.getRole().getName() == RoleName.WORKSPACE_ADMIN)
                .count();
        long leaderCount = memberships.stream()
                .filter(membership -> membership.isActive() && membership.getRole() != null && membership.getRole().getName() == RoleName.LEADER)
                .count();
        long memberCount = memberships.stream()
                .filter(membership -> membership.isActive() && membership.getRole() != null && membership.getRole().getName() == RoleName.MEMBER)
                .count();

        return new AdminWorkspaceDetailResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.isActive(),
                memberships.size(),
                activeMembers,
                workspaceAdminCount,
                leaderCount,
                memberCount,
                mappedMemberships
        );
    }

    @Override
    @Transactional
    public AdminWorkspaceSummaryResponse lockWorkspace(Long workspaceId) {
        return setWorkspaceActive(workspaceId, false);
    }

    @Override
    @Transactional
    public AdminWorkspaceSummaryResponse unlockWorkspace(Long workspaceId) {
        return setWorkspaceActive(workspaceId, true);
    }

    @Override
    @Transactional
    public AdminWorkspaceDetailResponse updateWorkspace(Long workspaceId, AdminWorkspaceUpdateRequest request) {
        Workspace workspace = loadWorkspace(workspaceId);
        String newName = request.getName().trim();

        workspaceRepository.findByName(newName)
                .filter(existing -> !existing.getId().equals(workspaceId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Workspace name already exists");
                });

        workspace.setName(newName);
        workspace.setDescription(request.getDescription());
        workspaceRepository.save(workspace);
        return getWorkspace(workspaceId);
    }

    @Override
    public PageResponse<AdminMembershipResponse> getWorkspaceMembers(Long workspaceId, Pageable pageable) {
        loadWorkspace(workspaceId);
        Page<WorkspaceMembership> memberships = workspaceMembershipRepository.findByWorkspace_Id(workspaceId, pageable);
        return PageResponse.fromPage(memberships.map(AdminMembershipResponse::fromEntity));
    }

    private AdminUserSummaryResponse setUserActive(Long userId, boolean active) {
        User user = loadUser(userId);
        if (user.isActive() == active) {
            return AdminUserSummaryResponse.fromEntity(user, workspaceMembershipRepository.countByUserId(user.getId()));
        }

        if (!active && user.isSuperAdmin() && userRepository.countByIsSuperAdminTrue() <= 1) {
            throw new IllegalStateException("At least one SUPER_ADMIN must remain active");
        }

        user.setActive(active);
        userRepository.save(user);
        return AdminUserSummaryResponse.fromEntity(user, workspaceMembershipRepository.countByUserId(user.getId()));
    }

    private AdminWorkspaceSummaryResponse setWorkspaceActive(Long workspaceId, boolean active) {
        Workspace workspace = loadWorkspace(workspaceId);
        if (workspace.isActive() == active) {
            return AdminWorkspaceSummaryResponse.fromEntity(workspace,
                    workspaceMembershipRepository.countActiveByWorkspaceId(workspaceId));
        }

        workspace.setActive(active);
        workspaceRepository.save(workspace);
        return AdminWorkspaceSummaryResponse.fromEntity(workspace,
                workspaceMembershipRepository.countActiveByWorkspaceId(workspaceId));
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
    }

    private Workspace loadWorkspace(Long workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NoSuchElementException("Workspace not found"));
    }

    private String normalize(String search) {
        if (search == null) {
            return null;
        }
        String trimmed = search.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
