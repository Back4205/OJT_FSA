package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.request.CreateCommentRequest;
import com.example.taskmanagement.dto.response.ApiResponse;
import com.example.taskmanagement.dto.response.CommentResponse;
import com.example.taskmanagement.security.AuthEmailExtractor;
import com.example.taskmanagement.service.CommentService;
import com.example.taskmanagement.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller quản lý Comment.
 */
@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final UserRepository userRepository;

    @GetMapping("/task/{taskId}")
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN', 'MEMBER')")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getCommentsByTaskId(@PathVariable Long taskId) {
        try {
            List<CommentResponse> comments = commentService.getCommentsByTaskId(taskId);
            return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bình luận thành công", comments));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('LEADER', 'WORKSPACE_ADMIN', 'MEMBER')")
    public ResponseEntity<ApiResponse<CommentResponse>> createComment(
            @Valid @RequestBody CreateCommentRequest request,
            Authentication authentication) {
        try {
            String email = AuthEmailExtractor.extractEmail(authentication);
            Long currentUserId = userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalStateException("User không tồn tại"))
                    .getId();
                    
            CommentResponse created = commentService.createComment(request, currentUserId);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Tạo bình luận thành công", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
