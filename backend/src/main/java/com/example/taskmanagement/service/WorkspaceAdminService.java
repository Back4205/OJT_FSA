package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.*;
import com.example.taskmanagement.dto.response.*;
import java.util.List;

/**
 * Service quản lý các hoạt động nghiệp vụ dành riêng cho vai trò WORKSPACE_ADMIN.
 * Gồm quản lý thông tin Workspace, thành viên, dự án và báo cáo thống kê.
 */
public interface WorkspaceAdminService {

    /**
     * Lấy thông tin chi tiết của Workspace hiện tại.
     * @param workspaceId ID của workspace đang hoạt động
     * @return WorkspaceResponse chứa thông tin chi tiết tên, mô tả
     */
    WorkspaceResponse getWorkspaceDetails(Long workspaceId);

    /**
     * Cập nhật thông tin chi tiết (tên, mô tả) của Workspace.
     * @param workspaceId ID của workspace đang hoạt động
     * @param request dữ liệu cập nhật tên và mô tả
     * @return WorkspaceResponse đã được cập nhật thành công
     */
    WorkspaceResponse updateWorkspaceDetails(Long workspaceId, WorkspaceUpdateRequest request);

    /**
     * Lấy danh sách thành viên trong Workspace. Có hỗ trợ filter theo trạng thái active và vai trò.
     * @param workspaceId ID của workspace đang hoạt động
     * @param isActive (Optional) Trạng thái active/inactive của membership
     * @param roleName (Optional) Tên vai trò cần lọc (E.g. LEADER, MEMBER, WORKSPACE_ADMIN)
     * @return Danh sách thành viên kiểu MembershipResponse
     */
    List<MembershipResponse> getWorkspaceMembers(Long workspaceId, Boolean isActive, String roleName);

    /**
     * Mời/Thêm một thành viên mới vào Workspace qua địa chỉ email.
     * Nếu email chưa đăng ký tài khoản hệ thống, tự động tạo tài khoản nháp.
     * @param workspaceId ID của workspace đang hoạt động
     * @param request email và role định gán
     * @return MembershipResponse chứa thông tin thẻ thành viên mới
     */
    MembershipResponse addWorkspaceMember(Long workspaceId, MemberAddRequest request);

    MembershipResponse updateMemberRole(Long workspaceId, Long userId, MemberRoleUpdateRequest request);

    /**
     * Thay đổi vai trò (thăng chức/hạ chức) của một thành viên trong một Dự án cụ thể.
     */
    void updateProjectMemberRole(Long workspaceId, Long projectId, Long userId, MemberRoleUpdateRequest request);

    /**
     * Vô hiệu hóa (Deactivate/Soft Delete) một thành viên khỏi Workspace.
     * @param workspaceId ID của workspace đang hoạt động
     * @param userId ID của người dùng cần vô hiệu hóa
     */
    void deactivateWorkspaceMember(Long workspaceId, Long userId);

    /**
     * Kích hoạt lại (Activate/Unban) một thành viên đã bị vô hiệu hóa trong Workspace.
     * @param workspaceId ID của workspace đang hoạt động
     * @param userId ID của người dùng cần kích hoạt lại
     */
    void activateWorkspaceMember(Long workspaceId, Long userId);

    /**
     * Lấy danh sách tất cả các dự án trong Workspace.
     * @param workspaceId ID của workspace đang hoạt động
     * @return Danh sách ProjectResponse của các dự án nằm trong Workspace
     */
    List<ProjectResponse> getWorkspaceProjects(Long workspaceId);

    /**
     * Tạo một dự án mới trực thuộc Workspace hiện tại.
     * Bắt buộc phải chọn leader và leader phải thuộc workspace hiện tại.
     * @param workspaceId ID của workspace đang hoạt động
     * @param request tên dự án, mô tả, và ID người làm dự án trưởng (Leader)
     * @return ProjectResponse của dự án vừa khởi tạo thành công
     */
    ProjectResponse createProject(Long workspaceId, ProjectCreateRequest request);

    /**
     * Thêm thành viên vào danh sách dự án.
     * Cả dự án và thành viên được thêm đều phải cùng năm trong Workspace hiện tại.
     * @param workspaceId ID của workspace đang hoạt động
     * @param projectId ID của dự án cần thêm thành viên
     * @param request ID người dùng cần thêm
     * @return ProjectResponse chứa danh sách thành viên mới cập nhật
     */
    ProjectResponse addProjectMember(Long workspaceId, Long projectId, ProjectMemberRequest request);

    /**
     * Xóa thành viên ra khỏi dự án.
     * Cả dự án và thành viên đều phải thuộc Workspace hiện tại.
     * @param workspaceId ID của workspace đang hoạt động
     * @param projectId ID của dự án
     * @param userId ID người dùng cần xóa khỏi dự án
     * @return ProjectResponse sau khi đã xóa thành viên thành công
     */
    ProjectResponse removeProjectMember(Long workspaceId, Long projectId, Long userId);

    /**
     * Lấy dữ liệu thống kê tổng hợp của Workspace để hiển thị trên dashboard.
     * @param workspaceId ID của workspace đang hoạt động
     * @return DashboardStatsResponse thống kê dự án, thành viên, và các task theo trạng thái/mức độ ưu tiên
     */
    DashboardStatsResponse getDashboardStats(Long workspaceId);
}
