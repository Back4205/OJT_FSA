package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.request.CreateTaskRequest;
import com.example.taskmanagement.dto.request.UpdateTaskRequest;
import com.example.taskmanagement.dto.request.UpdateTaskStatusRequest;
import com.example.taskmanagement.dto.response.ApiResponse;
import com.example.taskmanagement.dto.response.TaskResponse;
import com.example.taskmanagement.model.enums.TaskPriority;
import com.example.taskmanagement.model.enums.TaskStatus;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.security.AuthEmailExtractor;
import com.example.taskmanagement.security.CookieUtil;
import com.example.taskmanagement.security.JwtService;
import com.example.taskmanagement.service.TaskService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**

 */
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    private final UserRepository userRepository;

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN', 'MEMBER')")
    public ResponseEntity<ApiResponse<Page<TaskResponse>>> getTasksByProject(
            @PathVariable Long projectId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        try {
            Page<TaskResponse> tasks = taskService.getTasksByProject(
                    projectId, workspaceId, status, priority, pageable);
            return ResponseEntity.ok(ApiResponse.success("Tasks loaded successfully", tasks));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN')")
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            @Valid @RequestBody CreateTaskRequest body,
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);

        try {
            TaskResponse created = taskService.createTask(body, currentUserId, workspaceId);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Task created successfully", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN', 'MEMBER')")
    public ResponseEntity<ApiResponse<TaskResponse>> getTaskById(
            @PathVariable Long id,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);

        try {
            TaskResponse task = taskService.getTaskById(id, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Task details loaded successfully", task));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN')")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTaskRequest body,
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);
        String currentRole = extractCurrentRole(authentication);

        try {
            TaskResponse updated = taskService.updateTask(id, body, currentUserId, currentRole, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Task updated successfully", updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);
        String currentRole = extractCurrentRole(authentication);

        try {
            taskService.deleteTask(id, currentUserId, currentRole, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Task deleted successfully", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN', 'MEMBER')")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTaskStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTaskStatusRequest body,
            Authentication authentication,
            HttpServletRequest request) {

        Long workspaceId = extractWorkspaceId(request);
        Long currentUserId = extractCurrentUserId(authentication);
        String currentRole = extractCurrentRole(authentication);

        try {
            TaskResponse updated = taskService.updateTaskStatus(
                    id, body.getStatus(), currentUserId, currentRole, workspaceId);
            return ResponseEntity.ok(ApiResponse.success("Task status updated successfully", updated));
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

    private Long extractCurrentUserId(Authentication authentication) {
        String email = AuthEmailExtractor.extractEmail(authentication);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User does not exist"))
                .getId();
    }

    private String extractCurrentRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("MEMBER");
    }
}
