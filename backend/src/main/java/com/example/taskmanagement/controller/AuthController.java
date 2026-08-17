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
    public ResponseEntity<ApiResponse<UserResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        try {
            // Build backend origin dynamically so verification email links work through ngrok/LAN.
            String backendOrigin = buildBackendOrigin(httpRequest);
            UserResponse response = authService.register(request, backendOrigin);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Registration successful. Please check your email to verify your account.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam String token, HttpServletRequest request) {
        // Build frontend base URL dynamically from the incoming backend request.
        // When server.forward-headers-strategy=framework is set and the proxy forwards
        // X-Forwarded-Host / X-Forwarded-Proto, this correctly produces the ngrok/LAN URL.
        String dynamicFrontendBase = buildFrontendBase(request);
        try {
            authService.verifyEmail(token);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(java.net.URI.create(dynamicFrontendBase + "/login?verified=true"))
                    .build();
        } catch (Exception e) {
            String errorMsg = java.net.URLEncoder.encode(e.getMessage(), java.nio.charset.StandardCharsets.UTF_8);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(java.net.URI.create(dynamicFrontendBase + "/login?error=" + errorMsg))
                    .build();
        }
    }

    /** Reconstruct the frontend base URL (scheme://host[:port]/taskmanager) from the current request. */
    private String buildFrontendBase(HttpServletRequest request) {
        try {
            String scheme = request.getScheme();
            String host   = request.getServerName();
            int    port   = request.getServerPort();
            StringBuilder sb = new StringBuilder();
            sb.append(scheme).append("://").append(host);
            boolean defaultPort = ("https".equals(scheme) && port == 443) || ("http".equals(scheme) && port == 80);
            if (!defaultPort && port > 0) sb.append(":").append(port);
            sb.append("/taskmanager");
            return sb.toString();
        } catch (Exception e) {
            return frontendBaseUrl;
        }
    }

    /** Backend origin: same as buildFrontendBase but used for backend-served links (verify-email). */
    private String buildBackendOrigin(HttpServletRequest request) {
        // When server.forward-headers-strategy=framework is active, scheme/host already reflect
        // the ngrok/proxy domain (X-Forwarded-Host, X-Forwarded-Proto are applied automatically).
        return buildFrontendBase(request); // same host, same path prefix /taskmanager
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        try {
            // Pass the frontend origin so the reset link in the email uses the correct domain.
            String origin = httpRequest.getHeader("Origin");
            if (origin == null || origin.isBlank()) {
                String referer = httpRequest.getHeader("Referer");
                if (referer != null && !referer.isBlank()) {
                    try { origin = new java.net.URL(referer).getProtocol() + "://" + new java.net.URL(referer).getHost();
                        int p = new java.net.URL(referer).getPort();
                        if (p > 0) origin += ":" + p;
                        origin += "/taskmanager";
                    } catch (Exception ignored) { origin = null; }
                }
            } else {
                origin = origin + "/taskmanager";
            }
            authService.forgotPassword(request.getEmail(), origin);
            return ResponseEntity.ok(ApiResponse.success("Password reset request has been sent to your email.", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getPassword());
            return ResponseEntity.ok(ApiResponse.success("Password changed successfully. Please sign in with your new password.", null));
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
            // Return the OTP flow so the frontend can show the verification screen.
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
            return ResponseEntity.ok(ApiResponse.success("Login successful.", userResponse));
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
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            Authentication authentication,
            HttpServletResponse response) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not logged in"));
        }

        try {
            String email = AuthEmailExtractor.extractEmail(authentication);
            Long activeWorkspaceId = null;
            if (authentication.getPrincipal() instanceof com.example.taskmanagement.security.CustomUserDetails) {
                activeWorkspaceId = ((com.example.taskmanagement.security.CustomUserDetails) authentication.getPrincipal()).getActiveWorkspaceId();
            }
            UserResponse userResponse = authService.getCurrentUserByEmail(email, activeWorkspaceId);

            // Keep the access token aligned with the latest role stored in DB.
            // This avoids stale cookies causing 403 on role-gated screens after
            // a user is promoted to SUPER_ADMIN (or changes workspace role).
            String refreshedToken = jwtService.generateToken(
                    userResponse.getEmail(),
                    userResponse.getRole().name(),
                    userResponse.getWorkspaceId()
            );
            cookieUtil.addTokenCookie(response, refreshedToken, jwtService.getExpirationSeconds());

            return ResponseEntity.ok(ApiResponse.success("OK", userResponse));
        } catch (IllegalStateException e) {
            SecurityContextHolder.clearContext();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("User not found or session expired"));
        }
    }

    @GetMapping("/workspaces")
    public ResponseEntity<ApiResponse<java.util.List<com.example.taskmanagement.dto.response.UserWorkspaceResponse>>> getUserWorkspaces(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not logged in"));
        }
        try {
            String email = AuthEmailExtractor.extractEmail(authentication);
            var workspaces = authService.getUserWorkspaces(email);
            return ResponseEntity.ok(ApiResponse.success("Success", workspaces));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/create-workspace")
    public ResponseEntity<ApiResponse<UserResponse>> createWorkspace(
            Authentication authentication,
            @RequestParam String name,
            @RequestParam(required = false) String description,
            HttpServletResponse response) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }
        try {
            String email = AuthEmailExtractor.extractEmail(authentication);
            UserResponse userResponse = authService.createNewWorkspace(email, name, description, response);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Workspace created successfully", userResponse));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/join-workspace")
    public ResponseEntity<ApiResponse<UserResponse>> joinWorkspace(
            Authentication authentication,
            @RequestParam String inviteCode,
            HttpServletResponse response) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }
        try {
            String email = AuthEmailExtractor.extractEmail(authentication);
            UserResponse userResponse = authService.joinWorkspaceWithInviteCode(email, inviteCode, response);
            return ResponseEntity.ok(ApiResponse.success("Join request sent. Waiting for workspace admin approval.", userResponse));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            Authentication authentication,
            @Valid @RequestBody com.example.taskmanagement.dto.request.UpdateProfileRequest request,
            HttpServletResponse servletResponse) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }
        try {
            String email = AuthEmailExtractor.extractEmail(authentication);
            Long activeWorkspaceId = null;
            if (authentication.getPrincipal() instanceof com.example.taskmanagement.security.CustomUserDetails) {
                activeWorkspaceId = ((com.example.taskmanagement.security.CustomUserDetails) authentication.getPrincipal()).getActiveWorkspaceId();
            }
            UserResponse userResponse = authService.updateProfile(email, request, activeWorkspaceId);

            // Re-generate access token with updated username/email since username might have changed
            String refreshedToken = jwtService.generateToken(
                    userResponse.getEmail(),
                    userResponse.getRole().name(),
                    userResponse.getWorkspaceId()
            );
            cookieUtil.addTokenCookie(servletResponse, refreshedToken, jwtService.getExpirationSeconds());

            return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", userResponse));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
