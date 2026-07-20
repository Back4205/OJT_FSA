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
 * @author Vương Bách
 */
@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMembershipRepository membershipRepository;

    // ─── Create ───────────────────────────────────────────────────────────────

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

        // Tự động thêm leader vào danh sách member của project
        project.getMembers().add(leader);

        Project saved = projectRepository.save(project);
        return ProjectResponse.from(saved);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjectsByWorkspace(Long workspaceId, Long currentUserId, String currentRole) {
        List<Project> projects = projectRepository.findByWorkspaceId(workspaceId);

        if (!"WORKSPACE_ADMIN".equals(currentRole)) {
            projects = projects.stream()
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
                        "Project không tồn tại hoặc không thuộc workspace của bạn"));

        List<MemberResponse> members = buildMemberResponses(project, workspaceId);
        return ProjectDetailResponse.from(project, members);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

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

    // ─── Delete ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void deleteProject(Long projectId, Long currentUserId,
                              String currentRole, Long workspaceId) {
        Project project = getProjectInWorkspace(projectId, workspaceId);
        checkProjectOwnership(project, currentUserId, currentRole);
        projectRepository.delete(project);
    }

    // ─── Member management ────────────────────────────────────────────────────

    @Override
    @Transactional
    public void addMemberToProject(Long projectId, AddProjectMemberRequest request,
                                   Long currentUserId, String currentRole, Long workspaceId) {
        Project project = getProjectInWorkspace(projectId, workspaceId);
        checkProjectOwnership(project, currentUserId, currentRole);

        Long memberId = request.getMemberId();

        // Kiểm tra user tồn tại và là member active của workspace
        WorkspaceMembership membership = membershipRepository
                .findByUserIdAndWorkspaceId(memberId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User không phải member của workspace này"));

        if (!membership.isActive()) {
            throw new IllegalArgumentException("User đã bị khóa trong workspace này");
        }

        User newMember = membership.getUser();

        if (project.getMembers().contains(newMember)) {
            throw new IllegalArgumentException("User đã là member của project này rồi");
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

        // Không được xóa leader khỏi project
        if (project.getLeader().getId().equals(memberId)) {
            throw new IllegalArgumentException("Không thể xóa Leader ra khỏi project");
        }

        User memberToRemove = getUserById(memberId);

        if (!project.getMembers().contains(memberToRemove)) {
            throw new IllegalArgumentException("User không phải member của project này");
        }

        project.getMembers().remove(memberToRemove);
        projectRepository.save(project);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Lấy project và đảm bảo nó thuộc workspace hiện tại (từ JWT).
     */
    private Project getProjectInWorkspace(Long projectId, Long workspaceId) {
        return projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Project không tồn tại hoặc không thuộc workspace của bạn"));
    }

    /**
     * Kiểm tra quyền thao tác project:
     * - WORKSPACE_ADMIN: luôn được phép
     * - LEADER: chỉ được phép nếu là leader của project đó
     */
    private void checkProjectOwnership(Project project, Long currentUserId, String currentRole) {
        if (RoleName.WORKSPACE_ADMIN.name().equals(currentRole)) {
            return; // WORKSPACE_ADMIN có full quyền
        }
        if (!project.getLeader().getId().equals(currentUserId)) {
            throw new AccessDeniedException("Bạn chỉ có thể thao tác project do mình tạo");
        }
    }

    /**
     * Build danh sách MemberResponse với thông tin role trong workspace.
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
                .orElseThrow(() -> new IllegalArgumentException("User không tồn tại: " + userId));
    }

    private Workspace getWorkspaceById(Long workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Workspace không tồn tại: " + workspaceId));
    }
}
