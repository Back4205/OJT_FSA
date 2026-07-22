package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.response.ApiResponse;
import com.example.taskmanagement.dto.response.member.MemberDashboardResponse;
import com.example.taskmanagement.dto.request.member.MemberTaskStatusUpdateRequest;
import com.example.taskmanagement.dto.response.member.MemberNotificationResponse;
import com.example.taskmanagement.dto.response.member.MemberTaskResponse;
import com.example.taskmanagement.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/member")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER', 'LEADER', 'WORKSPACE_ADMIN', 'SUPER_ADMIN')")
public class MemberController {

    private final MemberService memberService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<MemberDashboardResponse>> dashboard(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("OK", memberService.getDashboard(authentication)));
    }

    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<List<MemberNotificationResponse>>> notifications(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("OK", memberService.getNotifications(authentication)));
    }

    @PatchMapping("/notifications/{notificationId}/read")
    public ResponseEntity<ApiResponse<MemberNotificationResponse>> updateNotificationReadState(
            Authentication authentication,
            @PathVariable Long notificationId,
            @RequestParam(defaultValue = "true") boolean read) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Notification updated successfully",
                    memberService.updateNotificationReadState(authentication, notificationId, read)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/notifications/read-all")
    public ResponseEntity<ApiResponse<List<MemberNotificationResponse>>> markAllNotificationsRead(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read",
                memberService.markAllNotificationsRead(authentication)));
    }

    @PatchMapping("/tasks/{taskId}/status")
    public ResponseEntity<ApiResponse<MemberTaskResponse>> updateTaskStatus(
            Authentication authentication,
            @PathVariable Long taskId,
            @Valid @RequestBody MemberTaskStatusUpdateRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Task status updated successfully",
                    memberService.updateTaskStatus(authentication, taskId, request.getStatus())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(ApiResponse.error(e.getMessage()));
        }
    }
}
