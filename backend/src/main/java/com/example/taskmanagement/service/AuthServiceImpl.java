package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.LoginRequest;
import com.example.taskmanagement.dto.request.RegisterRequest;
import com.example.taskmanagement.dto.request.LoginOtpRequest;
import com.example.taskmanagement.dto.response.UserResponse;
import com.example.taskmanagement.model.*;
import com.example.taskmanagement.model.enums.AuthProvider;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.repository.*;
import com.example.taskmanagement.security.CookieUtil;
import com.example.taskmanagement.security.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.taskmanagement.exception.OtpRequiredException;

import com.example.taskmanagement.model.enums.TokenType;
import org.springframework.beans.factory.annotation.Value;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMembershipRepository workspaceMembershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    private final RefreshTokenService refreshTokenService;
    private final VerificationTokenRepository verificationTokenRepository;
    private final EmailService emailService;

    @Value("${app.backend-base-url:http://localhost:8080/taskmanager}")
    private String backendBaseUrl;

    @Value("${app.frontend-base-url:http://localhost:5173/taskmanager}")
    private String frontendBaseUrl;

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use");
        }

        boolean hasWorkspace = request.getWorkspaceName() != null && !request.getWorkspaceName().trim().isEmpty();

        if (hasWorkspace && workspaceRepository.existsByName(request.getWorkspaceName().trim())) {
            throw new IllegalArgumentException("Workspace/Organization name already used");
        }

        Workspace workspace = null;
        if (hasWorkspace) {
            // Create workspace
            workspace = new Workspace();
            workspace.setName(request.getWorkspaceName().trim());
            workspace.setActive(true);
            workspace.setInviteCode("WS-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            workspace = workspaceRepository.save(workspace);
        }

        // Fallback global role on user
        Role memberRole = roleRepository.findByName(RoleName.MEMBER)
                .orElseThrow(() -> new IllegalStateException("Role MEMBER has not been seeded"));

        // Create user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setProvider(AuthProvider.LOCAL);
        user.setActive(true);
        user.setEmailVerified(false); // LOCAL users must verify email
        user = userRepository.save(user);

        // Generate email verification token
        String verificationTokenString = UUID.randomUUID().toString();
        VerificationToken verificationToken = new VerificationToken();
        verificationToken.setToken(verificationTokenString);
        verificationToken.setUser(user);
        verificationToken.setType(TokenType.EMAIL_VERIFICATION);
        verificationToken.setExpiryDate(LocalDateTime.now().plusDays(1)); // 24 hours expiry
        verificationTokenRepository.save(verificationToken);

        // Send confirmation email
        String verifyUrl = backendBaseUrl + "/api/auth/verify-email?token=" + verificationTokenString;
        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), verifyUrl);

        Role userRole = memberRole;
        if (hasWorkspace) {
            // Create workspace membership (with role WORKSPACE_ADMIN)
            Role adminRole = roleRepository.findByName(RoleName.WORKSPACE_ADMIN)
                    .orElseThrow(() -> new IllegalStateException("Role WORKSPACE_ADMIN has not been seeded"));

            WorkspaceMembership membership = new WorkspaceMembership();
            membership.setUser(user);
            membership.setWorkspace(workspace);
            membership.setRole(adminRole);
            membership.setActive(true);
            workspaceMembershipRepository.save(membership);
            userRole = adminRole;
        }

        return UserResponse.fromEntity(user, workspace, userRole);
    }

    @Override
    @Transactional(noRollbackFor = OtpRequiredException.class)
    public UserResponse login(LoginRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseGet(() -> userRepository.findByUsername(request.getEmail())
                        .orElseThrow(() -> new BadCredentialsException("Invalid username or password")));

        if (user.getProvider() != AuthProvider.LOCAL) {
            throw new BadCredentialsException(
                    "This account was registered via " + user.getProvider()
                            + ". Please log in using " + user.getProvider() + ".");
        }

        if (!user.isActive()) {
            throw new BadCredentialsException("This account has been locked. Please contact an Admin");
        }

        // Authenticate globally using email & password
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getEmail(), request.getPassword())
        );

        // MÃ OTP CHỈ CẦN XÁC THỰC 1 LẦN KHI CHƯA XÁC THỰC EMAIL.
        // NẾU TÀI KHOẢN ĐÃ XÁC THỰC RỒI (isEmailVerified = true), CHO PHÉP ĐĂNG NHẬP THẲNG.
        if (!user.isEmailVerified()) {
            // Generate 6-digit OTP code
            String otp = String.format("%06d", new java.util.Random().nextInt(1000000));

            // Delete old login OTPs for this user
            verificationTokenRepository.deleteByUserAndType(user, TokenType.LOGIN_OTP);

            // Save new LOGIN_OTP token
            VerificationToken verificationToken = new VerificationToken();
            verificationToken.setToken(otp);
            verificationToken.setUser(user);
            verificationToken.setType(TokenType.LOGIN_OTP);
            verificationToken.setExpiryDate(LocalDateTime.now().plusMinutes(5)); // Valid for 5 minutes
            verificationTokenRepository.save(verificationToken);

            // Send OTP email
            emailService.sendOtpEmail(user.getEmail(), otp);

            throw new com.example.taskmanagement.exception.OtpRequiredException("Mã OTP đăng nhập đã được gửi đến email của bạn.");
        }

        // --- ĐĂNG NHẬP THẲNG KHI ĐÃ XÁC THỰC TÀI KHOẢN ---
        // Fetch active memberships
        List<WorkspaceMembership> memberships = workspaceMembershipRepository.findByUserIdAndIsActive(user.getId(), true);

        Workspace activeWorkspace = null;
        Role activeRole;

        if (user.isSuperAdmin()) {
            activeRole = roleRepository.findByName(RoleName.SUPER_ADMIN)
                    .orElseThrow(() -> new IllegalStateException("Role SUPER_ADMIN has not been seeded"));
        } else {
            activeRole = roleRepository.findByName(RoleName.MEMBER)
                    .orElseThrow(() -> new IllegalStateException("Role MEMBER has not been seeded"));

            if (!memberships.isEmpty()) {
                WorkspaceMembership defaultMembership = memberships.get(0);
                activeWorkspace = defaultMembership.getWorkspace();
                activeRole = defaultMembership.getRole();
            }
        }

        // Build token with default workspace selection
        String token = jwtService.generateToken(
                user.getEmail(),
                activeRole.getName().name(),
                activeWorkspace != null ? activeWorkspace.getId() : null
        );
        cookieUtil.addTokenCookie(response, token, jwtService.getExpirationSeconds());

        // Create and add the refresh token cookie
        var refreshToken = refreshTokenService.createRefreshToken(user, activeWorkspace);
        cookieUtil.addRefreshTokenCookie(response, refreshToken.getToken(), refreshTokenService.getExpirationSeconds());

        // Clear any pre-existing JSESSIONID cookie
        cookieUtil.clearJSessionIdCookie(response);

        return UserResponse.fromEntity(user, activeWorkspace, activeRole);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUserByEmail(String email, Long activeWorkspaceId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User does not exist"));

        if (user.isSuperAdmin()) {
            Role superAdminRole = roleRepository.findByName(RoleName.SUPER_ADMIN)
                    .orElseThrow(() -> new IllegalStateException("Role SUPER_ADMIN has not been seeded"));
            return UserResponse.fromEntity(user, null, superAdminRole);
        }

        if (activeWorkspaceId != null) {
            var membershipOpt = workspaceMembershipRepository.findByUserIdAndWorkspaceId(user.getId(), activeWorkspaceId);
            if (membershipOpt.isPresent() && membershipOpt.get().isActive()) {
                WorkspaceMembership membership = membershipOpt.get();
                return UserResponse.fromEntity(user, membership.getWorkspace(), membership.getRole());
            }
        }

        // Fallback to first active membership
        List<WorkspaceMembership> memberships = workspaceMembershipRepository.findByUserIdAndIsActive(user.getId(), true);
        if (memberships.isEmpty()) {
            Role memberRole = roleRepository.findByName(RoleName.MEMBER)
                    .orElseThrow(() -> new IllegalStateException("Role MEMBER has not been seeded"));
            return UserResponse.fromEntity(user, null, memberRole);
        }
        
        WorkspaceMembership defaultMembership = memberships.get(0);
        return UserResponse.fromEntity(user, defaultMembership.getWorkspace(), defaultMembership.getRole());
    }

    @Override
    public UserResponse switchWorkspace(String email, Long workspaceId, HttpServletResponse response) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User does not exist"));

        if (!user.isActive()) {
            throw new BadCredentialsException("Account is locked");
        }

        WorkspaceMembership membership = workspaceMembershipRepository.findByUserIdAndWorkspaceId(user.getId(), workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this workspace"));

        if (!membership.isActive() || !membership.getWorkspace().isActive()) {
            throw new IllegalArgumentException("This workspace membership is locked");
        }

        // Generate new access and refresh token for the new workspace
        String token = jwtService.generateToken(
                user.getEmail(),
                membership.getRole().getName().name(),
                workspaceId
        );
        cookieUtil.addTokenCookie(response, token, jwtService.getExpirationSeconds());

        var refreshToken = refreshTokenService.createRefreshToken(user, membership.getWorkspace());
        cookieUtil.addRefreshTokenCookie(response, refreshToken.getToken(), refreshTokenService.getExpirationSeconds());

        return UserResponse.fromEntity(user, membership.getWorkspace(), membership.getRole());
    }

    @Override
    @Transactional
    public void verifyEmail(String token) {
        VerificationToken verificationToken = verificationTokenRepository.findByTokenAndType(token, TokenType.EMAIL_VERIFICATION)
                .orElseThrow(() -> new IllegalArgumentException("Mã xác thực không hợp lệ hoặc đã qua sử dụng."));

        if (verificationToken.isExpired()) {
            verificationTokenRepository.delete(verificationToken);
            throw new IllegalArgumentException("Mã xác thực đã hết hạn. Vui lòng đăng ký lại.");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        verificationTokenRepository.delete(verificationToken);
    }

    @Override
    @Transactional
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với email này."));

        if (user.getProvider() != AuthProvider.LOCAL) {
            throw new IllegalArgumentException("Tài khoản này được đăng ký thông qua " + user.getProvider() + ". Vui lòng đăng nhập qua đó.");
        }

        // Delete old password reset tokens for this user
        verificationTokenRepository.deleteByUserAndType(user, TokenType.PASSWORD_RESET);

        // Generate reset token
        String token = UUID.randomUUID().toString();
        VerificationToken resetToken = new VerificationToken();
        resetToken.setToken(token);
        resetToken.setUser(user);
        resetToken.setType(TokenType.PASSWORD_RESET);
        resetToken.setExpiryDate(LocalDateTime.now().plusHours(2)); // 2 hours validity for reset
        verificationTokenRepository.save(resetToken);

        // Send email
        String resetUrl = frontendBaseUrl + "/reset-password?token=" + token;
        emailService.sendPasswordResetEmail(user.getEmail(), resetUrl);
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        VerificationToken resetToken = verificationTokenRepository.findByTokenAndType(token, TokenType.PASSWORD_RESET)
                .orElseThrow(() -> new IllegalArgumentException("Mã đặt lại mật khẩu không hợp lệ."));

        if (resetToken.isExpired()) {
            verificationTokenRepository.delete(resetToken);
            throw new IllegalArgumentException("Mã đặt lại mật khẩu đã hết hạn.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        verificationTokenRepository.delete(resetToken);
    }

    @Override
    @Transactional
    public UserResponse verifyLoginOtp(LoginOtpRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với email này."));

        VerificationToken otpToken = verificationTokenRepository.findByTokenAndType(request.getOtpCode(), TokenType.LOGIN_OTP)
                .orElseThrow(() -> new IllegalArgumentException("Mã OTP không đúng hoặc đã được sử dụng."));

        if (!otpToken.getUser().getId().equals(user.getId())) {
             throw new IllegalArgumentException("Mã OTP không đúng với tài khoản này.");
        }

        if (otpToken.isExpired()) {
            verificationTokenRepository.delete(otpToken);
            throw new IllegalArgumentException("Mã OTP đã hết hạn. Vui lòng đăng nhập lại để nhận mã mới.");
        }

        // OTP is correct! Delete it
        verificationTokenRepository.delete(otpToken);

        // If email was not verified before, verify it now since they verified the OTP sent to their email
        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            userRepository.save(user);
        }

        // Fetch active memberships
        List<WorkspaceMembership> memberships = workspaceMembershipRepository.findByUserIdAndIsActive(user.getId(), true);

        Workspace activeWorkspace = null;
        Role activeRole;

        if (user.isSuperAdmin()) {
            activeRole = roleRepository.findByName(RoleName.SUPER_ADMIN)
                    .orElseThrow(() -> new IllegalStateException("Role SUPER_ADMIN has not been seeded"));
        } else {
            activeRole = roleRepository.findByName(RoleName.MEMBER)
                    .orElseThrow(() -> new IllegalStateException("Role MEMBER has not been seeded"));

            if (!memberships.isEmpty()) {
                WorkspaceMembership defaultMembership = memberships.get(0);
                activeWorkspace = defaultMembership.getWorkspace();
                activeRole = defaultMembership.getRole();
            }
        }

        // Build token with default workspace selection
        String token = jwtService.generateToken(
                user.getEmail(),
                activeRole.getName().name(),
                activeWorkspace != null ? activeWorkspace.getId() : null
        );
        cookieUtil.addTokenCookie(response, token, jwtService.getExpirationSeconds());

        // Create and add the refresh token cookie
        var refreshToken = refreshTokenService.createRefreshToken(user, activeWorkspace);
        cookieUtil.addRefreshTokenCookie(response, refreshToken.getToken(), refreshTokenService.getExpirationSeconds());

        // Clear any pre-existing JSESSIONID cookie
        cookieUtil.clearJSessionIdCookie(response);

        return UserResponse.fromEntity(user, activeWorkspace, activeRole);
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.example.taskmanagement.dto.response.UserWorkspaceResponse> getUserWorkspaces(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User does not exist"));
        List<WorkspaceMembership> memberships = workspaceMembershipRepository.findByUserIdAndIsActive(user.getId(), true);
        return memberships.stream()
                .map(m -> new com.example.taskmanagement.dto.response.UserWorkspaceResponse(
                        m.getWorkspace().getId(),
                        m.getWorkspace().getName(),
                        m.getRole().getName().name()
                ))
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    @Transactional
    public UserResponse createNewWorkspace(String email, String name, String description, HttpServletResponse response) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User does not exist"));

        if (workspaceRepository.existsByName(name.trim())) {
            throw new IllegalArgumentException("Workspace/Organization name is already in use");
        }

        // Create Workspace
        Workspace workspace = new Workspace();
        workspace.setName(name.trim());
        workspace.setDescription(description);
        workspace.setActive(true);
        workspace.setInviteCode("WS-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        workspace = workspaceRepository.save(workspace);

        // Retrieve workspace admin role
        Role adminRole = roleRepository.findByName(RoleName.WORKSPACE_ADMIN)
                .orElseThrow(() -> new IllegalStateException("Role WORKSPACE_ADMIN has not been seeded"));

        // Save Membership
        WorkspaceMembership membership = new WorkspaceMembership();
        membership.setUser(user);
        membership.setWorkspace(workspace);
        membership.setRole(adminRole);
        membership.setActive(true);
        workspaceMembershipRepository.save(membership);

        // Re-generate cookies/tokens for the new workspace context
        String token = jwtService.generateToken(
                user.getEmail(),
                adminRole.getName().name(),
                workspace.getId()
        );
        cookieUtil.addTokenCookie(response, token, jwtService.getExpirationSeconds());

        var refreshToken = refreshTokenService.createRefreshToken(user, workspace);
        cookieUtil.addRefreshTokenCookie(response, refreshToken.getToken(), refreshTokenService.getExpirationSeconds());

        return UserResponse.fromEntity(user, workspace, adminRole);
    }

    @Override
    @Transactional
    public UserResponse joinWorkspaceWithInviteCode(String email, String inviteCode, HttpServletResponse response) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User does not exist"));

        Workspace workspace = workspaceRepository.findByInviteCode(inviteCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Mã mời không tồn tại hoặc không hợp lệ."));

        if (!workspace.isActive()) {
            throw new IllegalArgumentException("Workspace này đã bị ngừng hoạt động.");
        }

        Role memberRole = roleRepository.findByName(RoleName.MEMBER)
                .orElseThrow(() -> new IllegalStateException("Role MEMBER has not been seeded"));

        // Check if already a member
        var existingMembershipOpt = workspaceMembershipRepository.findByUserIdAndWorkspaceId(user.getId(), workspace.getId());
        WorkspaceMembership membership;
        if (existingMembershipOpt.isPresent()) {
            membership = existingMembershipOpt.get();
            if (!membership.isActive()) {
                membership.setActive(true);
                workspaceMembershipRepository.save(membership);
            }
        } else {
            membership = new WorkspaceMembership();
            membership.setUser(user);
            membership.setWorkspace(workspace);
            membership.setRole(memberRole);
            membership.setActive(true);
            membership = workspaceMembershipRepository.save(membership);
        }

        // Re-generate cookies/tokens for the new workspace context
        String token = jwtService.generateToken(
                user.getEmail(),
                membership.getRole().getName().name(),
                workspace.getId()
        );
        cookieUtil.addTokenCookie(response, token, jwtService.getExpirationSeconds());

        var refreshToken = refreshTokenService.createRefreshToken(user, workspace);
        cookieUtil.addRefreshTokenCookie(response, refreshToken.getToken(), refreshTokenService.getExpirationSeconds());

        return UserResponse.fromEntity(user, workspace, membership.getRole());
    }
}