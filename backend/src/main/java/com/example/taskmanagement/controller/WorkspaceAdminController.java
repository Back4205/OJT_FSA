package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.request.*;
import com.example.taskmanagement.dto.response.*;
import com.example.taskmanagement.security.CurrentWorkspaceId;
import com.example.taskmanagement.service.WorkspaceAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**

 * Endpoint root: /api/workspaces/current

 */
@RestController
@RequestMapping("/api/workspaces/current")
@PreAuthorize("hasRole('WORKSPACE_ADMIN')")
@RequiredArgsConstructor
public class WorkspaceAdminController {

    private final WorkspaceAdminService workspaceAdminService;

    /**

     */
    @GetMapping
    public ResponseEntity<ApiResponse<WorkspaceResponse>> getWorkspaceDetails(
            @CurrentWorkspaceId Long workspaceId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        WorkspaceResponse response = workspaceAdminService.getWorkspaceDetails(workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Workspace details loaded successfully", response));
    }

    /**

     */
    @PutMapping
    public ResponseEntity<ApiResponse<WorkspaceResponse>> updateWorkspaceDetails(
            @CurrentWorkspaceId Long workspaceId,
            @Valid @RequestBody WorkspaceUpdateRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        WorkspaceResponse response = workspaceAdminService.updateWorkspaceDetails(workspaceId, request);
        return ResponseEntity.ok(ApiResponse.success("Workspace details updated successfully", response));
    }

    /**

     */
    @GetMapping("/members")
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> getWorkspaceMembers(
            @CurrentWorkspaceId Long workspaceId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String roleName) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        List<MembershipResponse> response = workspaceAdminService.getWorkspaceMembers(workspaceId, isActive, roleName);
        return ResponseEntity.ok(ApiResponse.success("Members loaded successfully", response));
    }

    /**

     */
    @PostMapping("/members")
    public ResponseEntity<ApiResponse<MembershipResponse>> addWorkspaceMember(
            @CurrentWorkspaceId Long workspaceId,
            @Valid @RequestBody MemberAddRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            MembershipResponse response = workspaceAdminService.addWorkspaceMember(workspaceId, request);
            return ResponseEntity.ok(ApiResponse.success("Member invited to workspace successfully", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @PutMapping("/members/{userId}/role")
    public ResponseEntity<ApiResponse<MembershipResponse>> updateMemberRole(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long userId,
            @Valid @RequestBody MemberRoleUpdateRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            MembershipResponse response = workspaceAdminService.updateMemberRole(workspaceId, userId, request);
            return ResponseEntity.ok(ApiResponse.success("Member role updated successfully", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @DeleteMapping("/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> deactivateWorkspaceMember(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long userId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            workspaceAdminService.deactivateWorkspaceMember(workspaceId, userId);
            return ResponseEntity.ok(ApiResponse.success("Member deactivated successfully", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @PutMapping("/members/{userId}/activate")
    public ResponseEntity<ApiResponse<Void>> activateWorkspaceMember(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long userId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            workspaceAdminService.activateWorkspaceMember(workspaceId, userId);
            return ResponseEntity.ok(ApiResponse.success("Member activated successfully", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @GetMapping("/projects")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getWorkspaceProjects(
            @CurrentWorkspaceId Long workspaceId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        List<ProjectResponse> response = workspaceAdminService.getWorkspaceProjects(workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Projects loaded successfully", response));
    }

    /**

     */
    @PostMapping("/projects")
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @CurrentWorkspaceId Long workspaceId,
            @Valid @RequestBody ProjectCreateRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            ProjectResponse response = workspaceAdminService.createProject(workspaceId, request);
            return ResponseEntity.ok(ApiResponse.success("Project created successfully", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @PostMapping("/projects/{projectId}/members")
    public ResponseEntity<ApiResponse<ProjectResponse>> addProjectMember(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectMemberRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            ProjectResponse response = workspaceAdminService.addProjectMember(workspaceId, projectId, request);
            return ResponseEntity.ok(ApiResponse.success("Member added to project successfully", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @DeleteMapping("/projects/{projectId}/members/{userId}")
    public ResponseEntity<ApiResponse<ProjectResponse>> removeProjectMember(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long projectId,
            @PathVariable Long userId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            ProjectResponse response = workspaceAdminService.removeProjectMember(workspaceId, projectId, userId);
            return ResponseEntity.ok(ApiResponse.success("Member removed from project successfully", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @PutMapping("/projects/{projectId}/members/{userId}/role")
    public ResponseEntity<ApiResponse<Void>> updateProjectMemberRole(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long projectId,
            @PathVariable Long userId,
            @Valid @RequestBody MemberRoleUpdateRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            workspaceAdminService.updateProjectMemberRole(workspaceId, projectId, userId, request);
            return ResponseEntity.ok(ApiResponse.success("Project role updated successfully", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @PutMapping("/projects/{projectId}/complete")
    public ResponseEntity<ApiResponse<Void>> completeProject(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long projectId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            workspaceAdminService.completeProject(workspaceId, projectId);
            return ResponseEntity.ok(ApiResponse.success("Project completed successfully", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @PutMapping("/projects/{projectId}/reactivate")
    public ResponseEntity<ApiResponse<Void>> reactivateProject(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long projectId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        try {
            workspaceAdminService.reactivateProject(workspaceId, projectId);
            return ResponseEntity.ok(ApiResponse.success("Project reactivated successfully", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @GetMapping("/dashboard-stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getDashboardStats(
            @CurrentWorkspaceId Long workspaceId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        DashboardStatsResponse response = workspaceAdminService.getDashboardStats(workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Dashboard statistics loaded successfully", response));
    }

    /**

     */
    @GetMapping("/activity-logs")
    public ResponseEntity<ApiResponse<List<ActivityLogResponse>>> getActivityLogs(
            @CurrentWorkspaceId Long workspaceId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        List<ActivityLogResponse> response = workspaceAdminService.getActivityLogs(workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Activity logs loaded successfully", response));
    }
}
