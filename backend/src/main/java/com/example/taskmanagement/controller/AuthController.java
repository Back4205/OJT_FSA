package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.request.LoginRequest;
import com.example.taskmanagement.dto.request.RegisterRequest;
import com.example.taskmanagement.dto.response.ApiResponse;
import com.example.taskmanagement.dto.response.UserResponse;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.security.AuthEmailExtractor;
import com.example.taskmanagement.security.CookieUtil;
import com.example.taskmanagement.security.JwtService;
import com.example.taskmanagement.service.AuthService;
import com.example.taskmanagement.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CookieUtil cookieUtil;
    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            UserResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Registration successful", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        try {
            UserResponse userResponse = authService.login(request, response);
            return ResponseEntity.ok(ApiResponse.success("Login successful", userResponse));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenVal = cookieUtil.extractRefreshTokenFromCookies(request);
        if (refreshTokenVal != null && !refreshTokenVal.isBlank()) {
            refreshTokenService.revokeToken(refreshTokenVal);
        }

        SecurityContextHolder.clearContext();
        cookieUtil.clearTokenCookie(response);
        cookieUtil.clearRefreshTokenCookie(response);
        // cookieUtil.clearJSessionIdCookie(response);

        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Void>> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenVal = cookieUtil.extractRefreshTokenFromCookies(request);
        if (refreshTokenVal == null || refreshTokenVal.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Refresh Token not found"));
        }

        try {
            var refreshTokenOpt = refreshTokenService.findByToken(refreshTokenVal);
            if (refreshTokenOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Refresh Token not registered"));
            }

            var refreshToken = refreshTokenOpt.get();
            refreshTokenService.verifyExpiration(refreshToken);

            User user = refreshToken.getUser();
            String newAccessToken = jwtService.generateToken(
                    user.getEmail(),
                    user.getRole().getName().name()
            );

            cookieUtil.addTokenCookie(response, newAccessToken, jwtService.getExpirationSeconds());

            // Rotate Refresh Token
            var newRefreshToken = refreshTokenService.createRefreshToken(user);
            cookieUtil.addRefreshTokenCookie(response, newRefreshToken.getToken(), refreshTokenService.getExpirationSeconds());

            return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", null));
        } catch (Exception e) {
            cookieUtil.clearTokenCookie(response);
            cookieUtil.clearRefreshTokenCookie(response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not logged in"));
        }

        try {
            String email = AuthEmailExtractor.extractEmail(authentication);
            UserResponse userResponse = authService.getCurrentUserByEmail(email);
            return ResponseEntity.ok(ApiResponse.success("OK", userResponse));
        } catch (IllegalStateException e) {
            SecurityContextHolder.clearContext();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("User not found or session expired"));
        }
    }
}
