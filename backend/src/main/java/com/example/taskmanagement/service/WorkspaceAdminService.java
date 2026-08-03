package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.*;
import com.example.taskmanagement.dto.response.*;
import java.util.List;

/**

 */
public interface WorkspaceAdminService {

    /**

     */
    WorkspaceResponse getWorkspaceDetails(Long workspaceId);

    /**

     */
    WorkspaceResponse updateWorkspaceDetails(Long workspaceId, WorkspaceUpdateRequest request);

    /**

     */
    List<MembershipResponse> getWorkspaceMembers(Long workspaceId, Boolean isActive, String roleName);

    /**

     */
    MembershipResponse addWorkspaceMember(Long workspaceId, MemberAddRequest request);

    MembershipResponse updateMemberRole(Long workspaceId, Long userId, MemberRoleUpdateRequest request);

    /**

     */
    void updateProjectMemberRole(Long workspaceId, Long projectId, Long userId, MemberRoleUpdateRequest request);

    /**

     */
    void deactivateWorkspaceMember(Long workspaceId, Long userId);

    /**

     */
    void activateWorkspaceMember(Long workspaceId, Long userId);

    /**

     */
    List<ProjectResponse> getWorkspaceProjects(Long workspaceId);

    /**

     */
    ProjectResponse createProject(Long workspaceId, ProjectCreateRequest request);

    /**

     */
    ProjectResponse addProjectMember(Long workspaceId, Long projectId, ProjectMemberRequest request);

    /**

     */
    ProjectResponse removeProjectMember(Long workspaceId, Long projectId, Long userId);

    /**

     */
    void completeProject(Long workspaceId, Long projectId);

    /**

     */
    void reactivateProject(Long workspaceId, Long projectId);

    /**

     */
    DashboardStatsResponse getDashboardStats(Long workspaceId);

    /**

     */
    List<ActivityLogResponse> getActivityLogs(Long workspaceId);
}
