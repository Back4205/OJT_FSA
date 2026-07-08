package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.LoginRequest;
import com.example.taskmanagement.dto.request.RegisterRequest;
import com.example.taskmanagement.dto.response.UserResponse;
import jakarta.servlet.http.HttpServletRequest;

/**
 * @author Vương Bách
 */
public interface AuthService {
    UserResponse register(RegisterRequest request);
    UserResponse login(LoginRequest request, HttpServletRequest httpServletRequest);
    UserResponse getCurrentUserByEmail(String email);
}