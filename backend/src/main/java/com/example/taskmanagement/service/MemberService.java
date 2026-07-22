package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.response.member.MemberDashboardResponse;
import com.example.taskmanagement.dto.response.member.MemberNotificationResponse;
import com.example.taskmanagement.dto.response.member.MemberTaskResponse;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface MemberService {
    MemberDashboardResponse getDashboard(Authentication authentication);
    MemberTaskResponse updateTaskStatus(Authentication authentication, Long taskId, com.example.taskmanagement.model.enums.TaskStatus status);
    List<MemberNotificationResponse> getNotifications(Authentication authentication);
    MemberNotificationResponse updateNotificationReadState(Authentication authentication, Long notificationId, boolean read);
    List<MemberNotificationResponse> markAllNotificationsRead(Authentication authentication);
}
