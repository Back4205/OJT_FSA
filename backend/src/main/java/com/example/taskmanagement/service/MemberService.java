package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.response.member.MemberDashboardResponse;
import org.springframework.security.core.Authentication;

public interface MemberService {
    MemberDashboardResponse getDashboard(Authentication authentication);
}
