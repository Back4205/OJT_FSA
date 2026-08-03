package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.request.MemberAddRequest;
import com.example.taskmanagement.dto.response.ApiResponse;
import com.example.taskmanagement.dto.response.MembershipResponse;
import com.example.taskmanagement.security.CurrentWorkspaceId;
import com.example.taskmanagement.service.WorkspaceAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**

 *
 * Endpoint root: /api/leader
 */
@RestController
@RequestMapping("/api/leader")
@PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN')")
@RequiredArgsConstructor
public class LeaderController {

    private final WorkspaceAdminService workspaceAdminService;

    /**

     */
    @GetMapping("/members")
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> getWorkspaceMembers(
            @CurrentWorkspaceId Long workspaceId,
            @RequestParam(required = false) Boolean isActive) {

        if (workspaceId == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Active workspace context not found"));
        }

        // Default to active members only.
        Boolean activeFilter = (isActive != null) ? isActive : true;
        List<MembershipResponse> members = workspaceAdminService
                .getWorkspaceMembers(workspaceId, activeFilter, null);

        return ResponseEntity.ok(ApiResponse.success(
                "Members loaded successfully", members));
    }

    /**

     */
    @PostMapping("/members/invite")
    public ResponseEntity<ApiResponse<MembershipResponse>> inviteMember(
            @CurrentWorkspaceId Long workspaceId,
            @Valid @RequestBody MemberAddRequest request) {

        if (workspaceId == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Active workspace context not found"));
        }

        // Force role = MEMBER; leaders cannot invite other leaders.
        request.setRoleName("MEMBER");

        try {
            MembershipResponse response = workspaceAdminService
                    .addWorkspaceMember(workspaceId, request);
            return ResponseEntity.ok(ApiResponse.success(
                    "Member invited to workspace successfully", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    @GetMapping("/dashboard-stats")
    public ResponseEntity<ApiResponse<com.example.taskmanagement.dto.response.DashboardStatsResponse>> getDashboardStats(
            @CurrentWorkspaceId Long workspaceId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Active workspace context not found"));
        }
        com.example.taskmanagement.dto.response.DashboardStatsResponse response = workspaceAdminService.getDashboardStats(workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Dashboard statistics loaded successfully", response));
    }
}
