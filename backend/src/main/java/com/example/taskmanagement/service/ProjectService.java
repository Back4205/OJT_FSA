package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.AddProjectMemberRequest;
import com.example.taskmanagement.dto.request.CreateProjectRequest;
import com.example.taskmanagement.dto.request.UpdateProjectRequest;
import com.example.taskmanagement.dto.response.ProjectDetailResponse;
import com.example.taskmanagement.dto.response.ProjectResponse;

import java.util.List;

/**

 */
public interface ProjectService {

    /**

     */
    ProjectResponse createProject(CreateProjectRequest request, Long currentUserId, Long workspaceId);

    /**

     */
    List<ProjectResponse> getProjectsByWorkspace(Long workspaceId, Long currentUserId, String currentRole);

    /**

     */
    ProjectDetailResponse getProjectById(Long projectId, Long workspaceId);

    /**

     */
    ProjectResponse updateProject(Long projectId, UpdateProjectRequest request,
                                  Long currentUserId, String currentRole, Long workspaceId);

    /**

     */
    void deleteProject(Long projectId, Long currentUserId, String currentRole, Long workspaceId);

    /**

     */
    void addMemberToProject(Long projectId, AddProjectMemberRequest request,
                            Long currentUserId, String currentRole, Long workspaceId);

    /**

     */
    void removeMemberFromProject(Long projectId, Long memberId,
                                 Long currentUserId, String currentRole, Long workspaceId);
}
