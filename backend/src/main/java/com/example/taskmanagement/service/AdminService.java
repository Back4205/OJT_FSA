package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.admin.AdminWorkspaceUpdateRequest;
import com.example.taskmanagement.dto.response.PageResponse;
import com.example.taskmanagement.dto.response.admin.AdminDashboardResponse;
import com.example.taskmanagement.dto.response.admin.AdminMembershipResponse;
import com.example.taskmanagement.dto.response.admin.AdminUserDetailResponse;
import com.example.taskmanagement.dto.response.admin.AdminUserSummaryResponse;
import com.example.taskmanagement.dto.response.admin.AdminWorkspaceDetailResponse;
import com.example.taskmanagement.dto.response.admin.AdminWorkspaceSummaryResponse;
import org.springframework.data.domain.Pageable;

public interface AdminService {
    AdminDashboardResponse getDashboard();

    PageResponse<AdminUserSummaryResponse> getUsers(String search, Boolean active, Boolean superAdmin, Pageable pageable);
    AdminUserDetailResponse getUser(Long userId);
    AdminUserSummaryResponse lockUser(Long userId);
    AdminUserSummaryResponse unlockUser(Long userId);
    AdminUserSummaryResponse setSuperAdmin(Long userId, boolean enabled, String actorEmail);
    PageResponse<AdminMembershipResponse> getUserMemberships(Long userId, Pageable pageable);

    PageResponse<AdminWorkspaceSummaryResponse> getWorkspaces(String search, Boolean active, Pageable pageable);
    AdminWorkspaceDetailResponse getWorkspace(Long workspaceId);
    AdminWorkspaceSummaryResponse lockWorkspace(Long workspaceId);
    AdminWorkspaceSummaryResponse unlockWorkspace(Long workspaceId);
    AdminWorkspaceDetailResponse updateWorkspace(Long workspaceId, AdminWorkspaceUpdateRequest request);
    PageResponse<AdminMembershipResponse> getWorkspaceMembers(Long workspaceId, Pageable pageable);
}
