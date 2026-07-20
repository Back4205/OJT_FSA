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
 * Controller cung cấp các API hỗ trợ cho LEADER trong Workspace.
 * LEADER được phép:
 *   - Xem danh sách member trong workspace (để add vào project)
 *   - Invite thêm MEMBER mới vào workspace (không được invite LEADER)
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
     * Lấy danh sách thành viên đang hoạt động trong Workspace hiện tại.
     * LEADER cần endpoint này để chọn assignee khi tạo task và
     * chọn member khi add vào project.
     */
    @GetMapping("/members")
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> getWorkspaceMembers(
            @CurrentWorkspaceId Long workspaceId,
            @RequestParam(required = false) Boolean isActive) {

        if (workspaceId == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }

        // Mặc định chỉ lấy thành viên đang active
        Boolean activeFilter = (isActive != null) ? isActive : true;
        List<MembershipResponse> members = workspaceAdminService
                .getWorkspaceMembers(workspaceId, activeFilter, null);

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách thành viên thành công", members));
    }

    /**
     * LEADER invite thêm MEMBER mới vào workspace.
     * Quy tắc: LEADER chỉ được mời với role MEMBER,
     * backend sẽ tự ép roleName = "MEMBER" bất kể request gửi gì.
     */
    @PostMapping("/members/invite")
    public ResponseEntity<ApiResponse<MembershipResponse>> inviteMember(
            @CurrentWorkspaceId Long workspaceId,
            @Valid @RequestBody MemberAddRequest request) {

        if (workspaceId == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }

        // Ép role = MEMBER — LEADER không được invite LEADER khác
        request.setRoleName("MEMBER");

        try {
            MembershipResponse response = workspaceAdminService
                    .addWorkspaceMember(workspaceId, request);
            return ResponseEntity.ok(ApiResponse.success(
                    "Mời thành viên vào Workspace thành công", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
