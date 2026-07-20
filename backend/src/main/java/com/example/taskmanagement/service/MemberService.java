package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.response.member.MemberDashboardResponse;
import com.example.taskmanagement.dto.response.member.MemberTaskResponse;
import org.springframework.security.core.Authentication;

public interface MemberService {
    MemberDashboardResponse getDashboard(Authentication authentication);
    MemberTaskResponse updateTaskStatus(Authentication authentication, Long taskId, com.example.taskmanagement.model.enums.TaskStatus status);
}
