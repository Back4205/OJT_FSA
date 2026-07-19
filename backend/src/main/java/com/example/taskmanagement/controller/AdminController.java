package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.request.admin.AdminWorkspaceUpdateRequest;
import com.example.taskmanagement.dto.request.admin.AdminUserPasswordUpdateRequest;
import com.example.taskmanagement.dto.response.ApiResponse;
import com.example.taskmanagement.dto.response.PageResponse;
import com.example.taskmanagement.dto.response.admin.AdminDashboardResponse;
import com.example.taskmanagement.dto.response.admin.AdminMembershipResponse;
import com.example.taskmanagement.dto.response.admin.AdminUserDetailResponse;
import com.example.taskmanagement.dto.response.admin.AdminUserSummaryResponse;
import com.example.taskmanagement.dto.response.admin.AdminWorkspaceDetailResponse;
import com.example.taskmanagement.dto.response.admin.AdminWorkspaceSummaryResponse;
import com.example.taskmanagement.security.AuthEmailExtractor;
import com.example.taskmanagement.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.success("OK", adminService.getDashboard()));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PageResponse<AdminUserSummaryResponse>>> users(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean superAdmin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                "OK",
                adminService.getUsers(search, active, superAdmin, PageRequest.of(page, size, Sort.by("id").descending()))
        ));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<AdminUserDetailResponse>> user(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(ApiResponse.success("OK", adminService.getUser(userId)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/users/{userId}/memberships")
    public ResponseEntity<ApiResponse<PageResponse<AdminMembershipResponse>>> userMemberships(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            return ResponseEntity.ok(ApiResponse.success(
                    "OK",
                    adminService.getUserMemberships(userId, PageRequest.of(page, size, Sort.by("id").descending()))
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/users/{userId}/lock")
    public ResponseEntity<ApiResponse<AdminUserSummaryResponse>> lockUser(@PathVariable Long userId) {
        return updateUserStatus(userId, false);
    }

    @PatchMapping("/users/{userId}/unlock")
    public ResponseEntity<ApiResponse<AdminUserSummaryResponse>> unlockUser(@PathVariable Long userId) {
        return updateUserStatus(userId, true);
    }

    @PatchMapping("/users/{userId}/super-admin")
    public ResponseEntity<ApiResponse<AdminUserSummaryResponse>> updateSuperAdmin(
            @PathVariable Long userId,
            @RequestParam boolean enabled,
            Authentication authentication) {
        try {
            String actorEmail = authentication != null ? AuthEmailExtractor.extractEmail(authentication) : null;
            return ResponseEntity.ok(ApiResponse.success("OK", adminService.setSuperAdmin(userId, enabled, actorEmail)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/users/{userId}/email-verified")
    public ResponseEntity<ApiResponse<AdminUserSummaryResponse>> updateEmailVerified(
            @PathVariable Long userId,
            @RequestParam boolean enabled) {
        try {
            return ResponseEntity.ok(ApiResponse.success("OK", adminService.setUserEmailVerified(userId, enabled)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/users/{userId}/password")
    public ResponseEntity<ApiResponse<AdminUserSummaryResponse>> resetPassword(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserPasswordUpdateRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Password updated successfully", adminService.resetUserPassword(userId, request.getPassword())));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/workspaces")
    public ResponseEntity<ApiResponse<PageResponse<AdminWorkspaceSummaryResponse>>> workspaces(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                "OK",
                adminService.getWorkspaces(search, active, PageRequest.of(page, size, Sort.by("id").descending()))
        ));
    }

    @GetMapping("/workspaces/{workspaceId}")
    public ResponseEntity<ApiResponse<AdminWorkspaceDetailResponse>> workspace(@PathVariable Long workspaceId) {
        try {
            return ResponseEntity.ok(ApiResponse.success("OK", adminService.getWorkspace(workspaceId)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/workspaces/{workspaceId}/members")
    public ResponseEntity<ApiResponse<PageResponse<AdminMembershipResponse>>> workspaceMembers(
            @PathVariable Long workspaceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            return ResponseEntity.ok(ApiResponse.success(
                    "OK",
                    adminService.getWorkspaceMembers(workspaceId, PageRequest.of(page, size, Sort.by("id").descending()))
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/workspaces/{workspaceId}")
    public ResponseEntity<ApiResponse<AdminWorkspaceDetailResponse>> updateWorkspace(
            @PathVariable Long workspaceId,
            @Valid @RequestBody AdminWorkspaceUpdateRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Workspace updated successfully", adminService.updateWorkspace(workspaceId, request)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/workspaces/{workspaceId}/lock")
    public ResponseEntity<ApiResponse<AdminWorkspaceSummaryResponse>> lockWorkspace(@PathVariable Long workspaceId) {
        return updateWorkspaceStatus(workspaceId, false);
    }

    @PatchMapping("/workspaces/{workspaceId}/unlock")
    public ResponseEntity<ApiResponse<AdminWorkspaceSummaryResponse>> unlockWorkspace(@PathVariable Long workspaceId) {
        return updateWorkspaceStatus(workspaceId, true);
    }

    private ResponseEntity<ApiResponse<AdminUserSummaryResponse>> updateUserStatus(Long userId, boolean active) {
        try {
            AdminUserSummaryResponse response = active ? adminService.unlockUser(userId) : adminService.lockUser(userId);
            return ResponseEntity.ok(ApiResponse.success("OK", response));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    private ResponseEntity<ApiResponse<AdminWorkspaceSummaryResponse>> updateWorkspaceStatus(Long workspaceId, boolean active) {
        try {
            AdminWorkspaceSummaryResponse response = active
                    ? adminService.unlockWorkspace(workspaceId)
                    : adminService.lockWorkspace(workspaceId);
            return ResponseEntity.ok(ApiResponse.success("OK", response));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }
}
