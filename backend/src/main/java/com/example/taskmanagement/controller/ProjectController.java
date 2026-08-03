package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.request.AddProjectMemberRequest;
import com.example.taskmanagement.dto.request.CreateProjectRequest;
import com.example.taskmanagement.dto.request.UpdateProjectRequest;
import com.example.taskmanagement.dto.response.ApiResponse;
import com.example.taskmanagement.dto.response.ProjectDetailResponse;
import com.example.taskmanagement.dto.response.ProjectResponse;
import com.example.taskmanagement.security.AuthEmailExtractor;
import com.example.taskmanagement.security.JwtService;
import com.example.taskmanagement.service.ProjectService;
import com.example.taskmanagement.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.example.taskmanagement.security.CookieUtil;

import java.util.List;

/**

 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    private final UserRepository userRepository;

    // All workspace roles can view the project list.

    @GetMapping
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN', 'MEMBER')")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getProjects(
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);
        String currentRole = authentication.getAuthorities().stream()
                .findFirst().map(a -> a.getAuthority().replace("ROLE_", "")).orElse("");

        List<ProjectResponse> projects = projectService.getProjectsByWorkspace(workspaceId, currentUserId, currentRole);
        return ResponseEntity.ok(ApiResponse.success("Projects loaded successfully", projects));
    }

    // Only LEADER and WORKSPACE_ADMIN can create projects.

    @PostMapping
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN')")
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @Valid @RequestBody CreateProjectRequest body,
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);

        try {
            ProjectResponse created = projectService.createProject(body, currentUserId, workspaceId);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Project created successfully", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN', 'MEMBER')")
    public ResponseEntity<ApiResponse<ProjectDetailResponse>> getProjectById(
            @PathVariable Long id,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);

        try {
            ProjectDetailResponse detail = projectService.getProjectById(id, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Project details loaded successfully", detail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // LEADER can edit only projects they lead; WORKSPACE_ADMIN can edit all projects.

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN')")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProjectRequest body,
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);
        String currentRole = extractCurrentRole(authentication);

        try {
            ProjectResponse updated = projectService.updateProject(id, body, currentUserId, currentRole, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Project updated successfully", updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);
        String currentRole = extractCurrentRole(authentication);

        try {
            projectService.deleteProject(id, currentUserId, currentRole, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Project deleted successfully", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // Add a member to the project.

    @PostMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> addMember(
            @PathVariable Long id,
            @Valid @RequestBody AddProjectMemberRequest body,
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);
        String currentRole = extractCurrentRole(authentication);

        try {
            projectService.addMemberToProject(id, body, currentUserId, currentRole, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Member added to project successfully", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/members/{memberId}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Long id,
            @PathVariable Long memberId,
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);
        String currentRole = extractCurrentRole(authentication);

        try {
            projectService.removeMemberFromProject(id, memberId, currentUserId, currentRole, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Member removed from project successfully", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**

     */
    private Long extractWorkspaceId(HttpServletRequest request) {
        String token = cookieUtil.extractTokenFromCookies(request);
        if (token == null) {
            throw new IllegalStateException("Access token not found");
        }
        Long workspaceId = jwtService.extractWorkspaceId(token);
        if (workspaceId == null) {
            throw new IllegalStateException("Token does not contain workspaceId. Please select a workspace first.");
        }
        return workspaceId;
    }

    /**

     */
    private Long extractCurrentUserId(Authentication authentication) {
        String email = AuthEmailExtractor.extractEmail(authentication);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User does not exist"))
                .getId();
    }

    /**

     */
    private String extractCurrentRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("MEMBER");
    }
}
