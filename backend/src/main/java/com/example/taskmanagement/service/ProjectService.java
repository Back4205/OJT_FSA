package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.AddProjectMemberRequest;
import com.example.taskmanagement.dto.request.CreateProjectRequest;
import com.example.taskmanagement.dto.request.UpdateProjectRequest;
import com.example.taskmanagement.dto.response.ProjectDetailResponse;
import com.example.taskmanagement.dto.response.ProjectResponse;

import java.util.List;

/**
 * @author Vương Bách
 * Service interface cho các thao tác quản lý Project của LEADER và WORKSPACE_ADMIN.
 */
public interface ProjectService {

    /**
     * Tạo project mới trong workspace hiện tại.
     * Leader của project sẽ là currentUserId.
     */
    ProjectResponse createProject(CreateProjectRequest request, Long currentUserId, Long workspaceId);

    /**
     * Lấy danh sách project theo workspace (đã filter theo role)
     */
    List<ProjectResponse> getProjectsByWorkspace(Long workspaceId, Long currentUserId, String currentRole);

    /**
     * Lấy chi tiết project (kèm members và tasks).
     * Kiểm tra project phải thuộc workspaceId.
     */
    ProjectDetailResponse getProjectById(Long projectId, Long workspaceId);

    /**
     * Cập nhật thông tin project.
     * LEADER chỉ được cập nhật project do mình tạo (leader_id = currentUserId).
     * WORKSPACE_ADMIN được cập nhật mọi project.
     */
    ProjectResponse updateProject(Long projectId, UpdateProjectRequest request,
                                  Long currentUserId, String currentRole, Long workspaceId);

    /**
     * Xóa project.
     * LEADER chỉ được xóa project do mình tạo.
     * WORKSPACE_ADMIN được xóa mọi project.
     */
    void deleteProject(Long projectId, Long currentUserId, String currentRole, Long workspaceId);

    /**
     * Thêm một member (từ workspace) vào project.
     * Member phải có workspace_membership active trong workspace đó.
     */
    void addMemberToProject(Long projectId, AddProjectMemberRequest request,
                            Long currentUserId, String currentRole, Long workspaceId);

    /**
     * Xóa member khỏi project.
     * Không được xóa leader khỏi project.
     */
    void removeMemberFromProject(Long projectId, Long memberId,
                                 Long currentUserId, String currentRole, Long workspaceId);
}
