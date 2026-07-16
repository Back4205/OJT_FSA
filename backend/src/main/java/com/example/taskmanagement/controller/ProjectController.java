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
 * @author Vương Bách
 * Controller quản lý Project.
 * Mọi API đều scope theo workspaceId lấy từ JWT — KHÔNG lấy từ path hay body.
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    private final UserRepository userRepository;

    // ─── GET /api/projects ───────────────────────────────────────────────────
    // Tất cả role trong workspace đều xem được danh sách project

    @GetMapping
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN', 'MEMBER')")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getProjects(
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);

        List<ProjectResponse> projects = projectService.getProjectsByWorkspace(workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách project thành công", projects));
    }

    // ─── POST /api/projects ──────────────────────────────────────────────────
    // Chỉ LEADER và WORKSPACE_ADMIN mới tạo được project

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
                    .body(ApiResponse.success("Tạo project thành công", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ─── GET /api/projects/{id} ──────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN', 'MEMBER')")
    public ResponseEntity<ApiResponse<ProjectDetailResponse>> getProjectById(
            @PathVariable Long id,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);

        try {
            ProjectDetailResponse detail = projectService.getProjectById(id, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Lấy thông tin project thành công", detail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // ─── PUT /api/projects/{id} ──────────────────────────────────────────────
    // LEADER chỉ sửa project do mình tạo; WORKSPACE_ADMIN sửa tất cả

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
            return ResponseEntity.ok(ApiResponse.success("Cập nhật project thành công", updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // ─── DELETE /api/projects/{id} ───────────────────────────────────────────

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
            return ResponseEntity.ok(ApiResponse.success("Xóa project thành công", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // ─── POST /api/projects/{id}/members ─────────────────────────────────────
    // Thêm member vào project

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
            return ResponseEntity.ok(ApiResponse.success("Thêm member vào project thành công", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // ─── DELETE /api/projects/{id}/members/{memberId} ────────────────────────

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
            return ResponseEntity.ok(ApiResponse.success("Xóa member khỏi project thành công", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Trích xuất workspaceId từ JWT cookie — KHÔNG lấy từ path hay body.
     */
    private Long extractWorkspaceId(HttpServletRequest request) {
        String token = cookieUtil.extractTokenFromCookies(request);
        if (token == null) {
            throw new IllegalStateException("Không tìm thấy access token");
        }
        Long workspaceId = jwtService.extractWorkspaceId(token);
        if (workspaceId == null) {
            throw new IllegalStateException("Token không chứa workspaceId. Hãy chọn workspace trước.");
        }
        return workspaceId;
    }

    /**
     * Trích xuất userId của user đang đăng nhập từ email trong Authentication.
     */
    private Long extractCurrentUserId(Authentication authentication) {
        String email = AuthEmailExtractor.extractEmail(authentication);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User không tồn tại"))
                .getId();
    }

    /**
     * Lấy role hiện tại từ Spring Security (đã được set bởi UserDetailsServiceImpl).
     * Loại bỏ prefix "ROLE_" mà Spring tự thêm vào.
     */
    private String extractCurrentRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("MEMBER");
    }
}
