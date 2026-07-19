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
 * Controller cung cấp các API quản lý dành cho WORKSPACE_ADMIN.
 * Endpoint root: /api/workspaces/current
 * Toàn bộ các API trong controller này đều yêu cầu quyền WORKSPACE_ADMIN.
 */
@RestController
@RequestMapping("/api/workspaces/current")
@PreAuthorize("hasRole('WORKSPACE_ADMIN')")
@RequiredArgsConstructor
public class WorkspaceAdminController {

    private final WorkspaceAdminService workspaceAdminService;

    /**
     * Lấy thông tin chi tiết của Workspace hiện tại.
     * @param workspaceId ID của workspace đang đăng nhập (được tự động trích xuất từ JWT)
     * @return ApiResponse chứa thông tin WorkspaceResponse
     */
    @GetMapping
    public ResponseEntity<ApiResponse<WorkspaceResponse>> getWorkspaceDetails(
            @CurrentWorkspaceId Long workspaceId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        WorkspaceResponse response = workspaceAdminService.getWorkspaceDetails(workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin Workspace thành công", response));
    }

    /**
     * Cập nhật thông tin của Workspace hiện tại.
     * @param workspaceId ID của workspace đang đăng nhập (được tự động trích xuất từ JWT)
     * @param request thông tin tên, mô tả mới cần cập nhật
     * @return ApiResponse chứa WorkspaceResponse sau cập nhật
     */
    @PutMapping
    public ResponseEntity<ApiResponse<WorkspaceResponse>> updateWorkspaceDetails(
            @CurrentWorkspaceId Long workspaceId,
            @Valid @RequestBody WorkspaceUpdateRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        WorkspaceResponse response = workspaceAdminService.updateWorkspaceDetails(workspaceId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin Workspace thành công", response));
    }

    /**
     * Lấy danh sách toàn bộ thành viên thuộc Workspace hiện tại.
     * @param workspaceId ID của workspace đang đăng nhập
     * @param isActive (Optional) lọc các thành viên đang hoạt động hoặc đã bị deactive
     * @param roleName (Optional) lọc theo vai trò (LEADER, MEMBER, ...)
     * @return ApiResponse chứa danh sách MembershipResponse các thành viên
     */
    @GetMapping("/members")
    public ResponseEntity<ApiResponse<List<MembershipResponse>>> getWorkspaceMembers(
            @CurrentWorkspaceId Long workspaceId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String roleName) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        List<MembershipResponse> response = workspaceAdminService.getWorkspaceMembers(workspaceId, isActive, roleName);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thành viên thành công", response));
    }

    /**
     * Mời/Thêm một thành viên mới vào Workspace.
     * @param workspaceId ID của workspace đang đăng nhập
     * @param request email và vai trò gán ban đầu cho thành viên mới
     * @return ApiResponse chứa thông tin thành viên sau khi thêm vào Workspace
     */
    @PostMapping("/members")
    public ResponseEntity<ApiResponse<MembershipResponse>> addWorkspaceMember(
            @CurrentWorkspaceId Long workspaceId,
            @Valid @RequestBody MemberAddRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        try {
            MembershipResponse response = workspaceAdminService.addWorkspaceMember(workspaceId, request);
            return ResponseEntity.ok(ApiResponse.success("Mời thành viên vào Workspace thành công", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Cập nhật vai trò (Thăng chức / Hạ chức) cho một thành viên trong Workspace.
     * @param workspaceId ID của workspace đang đăng nhập
     * @param userId ID của người dùng cần đổi vai trò
     * @param request vai trò đổi mới (LEADER/MEMBER)
     * @return ApiResponse chứa thông tin thành viên sau khi đã cập nhật vai trò mới
     */
    @PutMapping("/members/{userId}/role")
    public ResponseEntity<ApiResponse<MembershipResponse>> updateMemberRole(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long userId,
            @Valid @RequestBody MemberRoleUpdateRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        try {
            MembershipResponse response = workspaceAdminService.updateMemberRole(workspaceId, userId, request);
            return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò thành viên thành công", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Vô hiệu hóa (Soft Delete) một thành viên ra khỏi Workspace.
     * Thành viên bị vô hiệu hóa sẽ không thể truy cập vào Workspace này nữa.
     * @param workspaceId ID của workspace đang đăng nhập
     * @param userId ID của người dùng cần vô hiệu hóa
     * @return ApiResponse thông báo kết quả thực thi
     */
    @DeleteMapping("/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> deactivateWorkspaceMember(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long userId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        try {
            workspaceAdminService.deactivateWorkspaceMember(workspaceId, userId);
            return ResponseEntity.ok(ApiResponse.success("Vô hiệu hóa thành viên thành công", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Kích hoạt lại (Unban) một thành viên đã bị vô hiệu hóa trong Workspace.
     * @param workspaceId ID của workspace đang đăng nhập
     * @param userId ID của người dùng cần kích hoạt lại
     * @return ApiResponse thông báo kết quả thực thi
     */
    @PutMapping("/members/{userId}/activate")
    public ResponseEntity<ApiResponse<Void>> activateWorkspaceMember(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long userId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        try {
            workspaceAdminService.activateWorkspaceMember(workspaceId, userId);
            return ResponseEntity.ok(ApiResponse.success("Kích hoạt thành viên thành công", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Lấy danh sách toàn bộ dự án (Project) trong Workspace hiện tại.
     * @param workspaceId ID của workspace đang đăng nhập
     * @return ApiResponse chứa danh sách ProjectResponse các dự án của Workspace
     */
    @GetMapping("/projects")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getWorkspaceProjects(
            @CurrentWorkspaceId Long workspaceId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        List<ProjectResponse> response = workspaceAdminService.getWorkspaceProjects(workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách dự án thành công", response));
    }

    /**
     * Tạo mới một dự án trực thuộc Workspace hiện tại.
     * @param workspaceId ID của workspace đang đăng nhập
     * @param request thông tin tên dự án, mô tả, và ID người làm dự án trưởng (Leader)
     * @return ApiResponse chứa ProjectResponse của dự án vừa tạo
     */
    @PostMapping("/projects")
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @CurrentWorkspaceId Long workspaceId,
            @Valid @RequestBody ProjectCreateRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        try {
            ProjectResponse response = workspaceAdminService.createProject(workspaceId, request);
            return ResponseEntity.ok(ApiResponse.success("Tạo dự án mới thành công", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Thêm một thành viên trong Workspace vào dự án (Project).
     * @param workspaceId ID của workspace đang đăng nhập
     * @param projectId ID của dự án cần thêm thành viên
     * @param request chứa ID của thành viên cần thêm
     * @return ApiResponse chứa ProjectResponse gồm danh sách thành viên mới của dự án
     */
    @PostMapping("/projects/{projectId}/members")
    public ResponseEntity<ApiResponse<ProjectResponse>> addProjectMember(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectMemberRequest request) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        try {
            ProjectResponse response = workspaceAdminService.addProjectMember(workspaceId, projectId, request);
            return ResponseEntity.ok(ApiResponse.success("Thêm thành viên vào dự án thành công", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Xóa/Gỡ bỏ một thành viên khỏi một dự án.
     * @param workspaceId ID của workspace đang đăng nhập
     * @param projectId ID của dự án
     * @param userId ID của người dùng cần xóa khỏi dự án
     * @return ApiResponse chứa ProjectResponse cập nhật thành viên sau xóa
     */
    @DeleteMapping("/projects/{projectId}/members/{userId}")
    public ResponseEntity<ApiResponse<ProjectResponse>> removeProjectMember(
            @CurrentWorkspaceId Long workspaceId,
            @PathVariable Long projectId,
            @PathVariable Long userId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        try {
            ProjectResponse response = workspaceAdminService.removeProjectMember(workspaceId, projectId, userId);
            return ResponseEntity.ok(ApiResponse.success("Xóa thành viên khỏi dự án thành công", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Lấy các số liệu thống kê tổng hợp phục vụ hiển thị Dashboard của Workspace.
     * @param workspaceId ID của workspace đang đăng nhập
     * @return ApiResponse chứa DashboardStatsResponse (Tổng số dự án, thành viên, và phân bố các trạng thái/mức ưu tiên)
     */
    @GetMapping("/dashboard-stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getDashboardStats(
            @CurrentWorkspaceId Long workspaceId) {
        if (workspaceId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ngữ cảnh Workspace hoạt động"));
        }
        DashboardStatsResponse response = workspaceAdminService.getDashboardStats(workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu thống kê Dashboard thành công", response));
    }
}
