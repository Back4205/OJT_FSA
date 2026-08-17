package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.LoginOtpRequest;
import com.example.taskmanagement.dto.request.LoginRequest;
import com.example.taskmanagement.dto.request.RegisterRequest;
import com.example.taskmanagement.dto.response.UserResponse;
import jakarta.servlet.http.HttpServletResponse;

public interface AuthService {
    UserResponse register(RegisterRequest request, String backendOrigin);
    UserResponse login(LoginRequest request, HttpServletResponse response);
    UserResponse verifyLoginOtp(LoginOtpRequest request, HttpServletResponse response);
    UserResponse getCurrentUserByEmail(String email, Long activeWorkspaceId);
    UserResponse switchWorkspace(String email, Long workspaceId, HttpServletResponse response);
    void verifyEmail(String token);
    void forgotPassword(String email, String frontendOrigin);
    void resetPassword(String token, String newPassword);
    java.util.List<com.example.taskmanagement.dto.response.UserWorkspaceResponse> getUserWorkspaces(String email);
    UserResponse createNewWorkspace(String email, String name, String description, HttpServletResponse response);
    UserResponse joinWorkspaceWithInviteCode(String email, String inviteCode, HttpServletResponse response);
    UserResponse updateProfile(String email, com.example.taskmanagement.dto.request.UpdateProfileRequest request, Long activeWorkspaceId);
}

