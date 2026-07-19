package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.response.ApiResponse;
import com.example.taskmanagement.dto.response.member.MemberDashboardResponse;
import com.example.taskmanagement.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
