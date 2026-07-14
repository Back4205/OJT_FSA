package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.request.LoginRequest;
import com.example.taskmanagement.dto.request.RegisterRequest;
import com.example.taskmanagement.dto.request.ForgotPasswordRequest;
import com.example.taskmanagement.dto.request.ResetPasswordRequest;
import com.example.taskmanagement.dto.request.LoginOtpRequest;
import org.springframework.beans.factory.annotation.Value;
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
    private final com.example.taskmanagement.repository.WorkspaceMembershipRepository workspaceMembershipRepository;

    @Value("${app.frontend-base-url:http://localhost:5173/taskmanager}")
    private String frontendBaseUrl;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            UserResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam String token) {
        try {
            authService.verifyEmail(token);
            return ResponseEntity.status(HttpStatus.FOUND) // 302 Redirect
                    .location(java.net.URI.create(frontendBaseUrl + "/login?verified=true"))
                    .build();
        } catch (Exception e) {
            String errorMsg = java.net.URLEncoder.encode(e.getMessage(), java.nio.charset.StandardCharsets.UTF_8);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(java.net.URI.create(frontendBaseUrl + "/login?error=" + errorMsg))
                    .build();
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            authService.forgotPassword(request.getEmail());
            return ResponseEntity.ok(ApiResponse.success("Yêu cầu đặt lại mật khẩu đã được gửi đến email của bạn.", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getPassword());
            return ResponseEntity.ok(ApiResponse.success("Mật khẩu đã được thay đổi thành công. Bạn hãy đăng nhập bằng mật khẩu mới.", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Object>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        try {
            UserResponse userResponse = authService.login(request, response);
            return ResponseEntity.ok(ApiResponse.success("Login successful", userResponse));
        } catch (com.example.taskmanagement.exception.OtpRequiredException e) {
            // Trả về luồng OTP để frontend hiển thị màn hình nhập mã xác thực
            return ResponseEntity.status(HttpStatus.ACCEPTED) // 202 Accepted
                    .body(ApiResponse.success("OTP_REQUIRED", request.getEmail()));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<UserResponse>> verifyOtp(
            @Valid @RequestBody LoginOtpRequest request,
            HttpServletResponse response) {
        try {
            UserResponse userResponse = authService.verifyLoginOtp(request, response);
            return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công.", userResponse));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
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
        cookieUtil.clearJSessionIdCookie(response);

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
            Long workspaceId = refreshToken.getWorkspace() != null ? refreshToken.getWorkspace().getId() : null;
            String activeRole = user.isSuperAdmin() ? com.example.taskmanagement.model.enums.RoleName.SUPER_ADMIN.name() : com.example.taskmanagement.model.enums.RoleName.MEMBER.name();

            if (workspaceId != null && !user.isSuperAdmin()) {
                var membership = workspaceMembershipRepository.findByUserIdAndWorkspaceId(user.getId(), workspaceId)
                        .orElseThrow(() -> new RuntimeException("Workspace membership revoked"));
                activeRole = membership.getRole().getName().name();
            }

            String newAccessToken = jwtService.generateToken(
                    user.getEmail(),
                    activeRole,
                    workspaceId
            );

            cookieUtil.addTokenCookie(response, newAccessToken, jwtService.getExpirationSeconds());

            // Rotate Refresh Token
            var newRefreshToken = refreshTokenService.createRefreshToken(user, refreshToken.getWorkspace());
            cookieUtil.addRefreshTokenCookie(response, newRefreshToken.getToken(), refreshTokenService.getExpirationSeconds());

            return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", null));
        } catch (Exception e) {
            cookieUtil.clearTokenCookie(response);
            cookieUtil.clearRefreshTokenCookie(response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/switch-workspace")
    public ResponseEntity<ApiResponse<UserResponse>> switchWorkspace(
            Authentication authentication,
            @RequestParam Long workspaceId,
            HttpServletResponse response) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }
        try {
            String email = AuthEmailExtractor.extractEmail(authentication);
            UserResponse userResponse = authService.switchWorkspace(email, workspaceId, response);
            return ResponseEntity.ok(ApiResponse.success("Workspace switched details", userResponse));
        } catch (IllegalArgumentException | BadCredentialsException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
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
