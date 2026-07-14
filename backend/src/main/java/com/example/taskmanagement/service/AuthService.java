package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.LoginOtpRequest;
import com.example.taskmanagement.dto.request.LoginRequest;
import com.example.taskmanagement.dto.request.RegisterRequest;
import com.example.taskmanagement.dto.response.UserResponse;
import jakarta.servlet.http.HttpServletResponse;

public interface AuthService {
    UserResponse register(RegisterRequest request);
    UserResponse login(LoginRequest request, HttpServletResponse response);
    UserResponse verifyLoginOtp(LoginOtpRequest request, HttpServletResponse response);
    UserResponse getCurrentUserByEmail(String email);
    UserResponse switchWorkspace(String email, Long workspaceId, HttpServletResponse response);
    void verifyEmail(String token);
    void forgotPassword(String email);
    void resetPassword(String token, String newPassword);
}

