package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.AddProjectMemberRequest;
import com.example.taskmanagement.dto.request.CreateProjectRequest;
import com.example.taskmanagement.dto.request.UpdateProjectRequest;
import com.example.taskmanagement.dto.response.MemberResponse;
import com.example.taskmanagement.dto.response.ProjectDetailResponse;
import com.example.taskmanagement.dto.response.ProjectResponse;
import com.example.taskmanagement.model.Project;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.Workspace;
import com.example.taskmanagement.model.WorkspaceMembership;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.repository.ProjectRepository;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.repository.WorkspaceMembershipRepository;
import com.example.taskmanagement.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**

 */
@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMembershipRepository membershipRepository;

    @Override
    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request,
                                         Long currentUserId, Long workspaceId) {
        User leader = getUserById(currentUserId);
        Workspace workspace = getWorkspaceById(workspaceId);

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setLeader(leader);
        project.setWorkspace(workspace);
        project.setMaxMembers(request.getMaxMembers());

        // Automatically add the leader to the project's member list.
        project.getMembers().add(leader);

        Project saved = projectRepository.save(project);
        return ProjectResponse.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjectsByWorkspace(Long workspaceId, Long currentUserId, String currentRole) {
        List<Project> projects = projectRepository.findByWorkspaceId(workspaceId);

        if (!"WORKSPACE_ADMIN".equals(currentRole)) {
            projects = projects.stream()
                    .filter(p -> p.getIsDeleted() == null || !p.getIsDeleted())
                    .filter(p -> p.getLeader().getId().equals(currentUserId) ||
                            p.getMembers().stream().anyMatch(m -> m.getId().equals(currentUserId)))
                    .collect(Collectors.toList());
        }

        return projects.stream()
                .map(ProjectResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectDetailResponse getProjectById(Long projectId, Long workspaceId) {
        Project project = projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Project does not exist or does not belong to your workspace"));

        List<MemberResponse> members = buildMemberResponses(project, workspaceId);
        return ProjectDetailResponse.from(project, members);
    }

    @Override
    @Transactional
    public ProjectResponse updateProject(Long projectId, UpdateProjectRequest request,
                                         Long currentUserId, String currentRole, Long workspaceId) {
        Project project = getProjectInWorkspace(projectId, workspaceId);
        checkProjectOwnership(project, currentUserId, currentRole);

        if (request.getName() != null && !request.getName().isBlank()) {
            project.setName(request.getName());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }

        return ProjectResponse.from(projectRepository.save(project));
    }

    @Override
    @Transactional
    public void deleteProject(Long projectId, Long currentUserId,
                              String currentRole, Long workspaceId) {
        Project project = getProjectInWorkspace(projectId, workspaceId);
        checkProjectOwnership(project, currentUserId, currentRole);
        projectRepository.delete(project);
    }

    @Override
    @Transactional
    public void addMemberToProject(Long projectId, AddProjectMemberRequest request,
                                   Long currentUserId, String currentRole, Long workspaceId) {
        Project project = getProjectInWorkspace(projectId, workspaceId);
        checkProjectOwnership(project, currentUserId, currentRole);

        Long memberId = request.getMemberId();

        // Check that the user exists and is an active workspace member.
        WorkspaceMembership membership = membershipRepository
                .findByUserIdAndWorkspaceId(memberId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User is not a member of this workspace"));

        if (!membership.isActive()) {
            throw new IllegalArgumentException("User is locked in this workspace");
        }

        User newMember = membership.getUser();

        if (project.getMembers().contains(newMember)) {
            throw new IllegalArgumentException("User is already a member of this project");
        }

        if (project.getMaxMembers() != null && project.getMembers().size() >= project.getMaxMembers()) {
            throw new IllegalArgumentException("Project has reached the maximum member limit (" + project.getMaxMembers() + ")");
        }

        project.getMembers().add(newMember);
        projectRepository.save(project);
    }

    @Override
    @Transactional
    public void removeMemberFromProject(Long projectId, Long memberId,
                                        Long currentUserId, String currentRole, Long workspaceId) {
        Project project = getProjectInWorkspace(projectId, workspaceId);
        checkProjectOwnership(project, currentUserId, currentRole);

        // Do not remove the project leader.
        if (project.getLeader().getId().equals(memberId)) {
            throw new IllegalArgumentException("Cannot remove the leader from the project");
        }

        User memberToRemove = getUserById(memberId);

        if (!project.getMembers().contains(memberToRemove)) {
            throw new IllegalArgumentException("User is not a member of this project");
        }

        project.getMembers().remove(memberToRemove);
        projectRepository.save(project);
    }

    /**
     * Load a project and ensure it belongs to the current workspace from the JWT.
     */
    private Project getProjectInWorkspace(Long projectId, Long workspaceId) {
        return projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Project does not exist or does not belong to your workspace"));
    }

    /**
     * Check project access:
     * - WORKSPACE_ADMIN: always allowed
     * - LEADER: allowed only for projects they lead
     */
    private void checkProjectOwnership(Project project, Long currentUserId, String currentRole) {
        if (RoleName.WORKSPACE_ADMIN.name().equals(currentRole)) {
            return; // WORKSPACE_ADMIN has full access.
        }
        if (!project.getLeader().getId().equals(currentUserId)) {
            throw new AccessDeniedException("You can only manage projects you created");
        }
    }

    /**
     * Build MemberResponse list with workspace role information.
     */
    private List<MemberResponse> buildMemberResponses(Project project, Long workspaceId) {
        return project.getMembers().stream()
                .map(user -> {
                    RoleName role = membershipRepository
                            .findByUserIdAndWorkspaceId(user.getId(), workspaceId)
                            .map(m -> m.getRole().getName())
                            .orElse(RoleName.MEMBER);
                    return new MemberResponse(user.getId(), user.getUsername(), user.getEmail(), role);
                })
                .collect(Collectors.toList());
    }

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User does not exist: " + userId));
    }

    private Workspace getWorkspaceById(Long workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Workspace does not exist: " + workspaceId));
    }
}
