package com.example.taskmanagement.security;

import com.example.taskmanagement.model.User;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.service.RefreshTokenService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final HttpCookieOAuth2AuthorizationRequestRepository httpCookieOAuth2AuthorizationRequestRepository;
    private final com.example.taskmanagement.repository.WorkspaceMembershipRepository workspaceMembershipRepository;

    @Value("${app.frontend-url:http://localhost:5173/taskmanager/dashboard}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        String email = AuthEmailExtractor.extractEmail(authentication);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("OAuth user not found: " + email));

        var memberships = workspaceMembershipRepository.findByUserIdAndIsActiveOrderByIdDesc(user.getId(), true);
        Long workspaceId = null;
        com.example.taskmanagement.model.Workspace activeWorkspace = null;
        String activeRole = user.isSuperAdmin() ? com.example.taskmanagement.model.enums.RoleName.SUPER_ADMIN.name() : com.example.taskmanagement.model.enums.RoleName.MEMBER.name();

        if (!user.isSuperAdmin() && !memberships.isEmpty()) {
            var defaultMembership = memberships.get(0);
            workspaceId = defaultMembership.getWorkspace().getId();
            activeWorkspace = defaultMembership.getWorkspace();
            activeRole = defaultMembership.getRole().getName().name();
        }

        String token = jwtService.generateToken(
                user.getEmail(),
                activeRole,
                workspaceId
        );
        cookieUtil.addTokenCookie(response, token, jwtService.getExpirationSeconds());

        var refreshToken = refreshTokenService.createRefreshToken(user, activeWorkspace);
        cookieUtil.addRefreshTokenCookie(response, refreshToken.getToken(), refreshTokenService.getExpirationSeconds());

        String targetUrl = determineTargetUrl(request);

        httpCookieOAuth2AuthorizationRequestRepository.removeAuthorizationRequestCookies(request, response);
        cookieUtil.clearJSessionIdCookie(response);

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private String determineTargetUrl(HttpServletRequest request) {
        String serverName = request.getServerName();
        String scheme = request.getScheme();
        int port = request.getServerPort();

        // If it's hitting localhost:8080, it means it came through Vite's proxy without Forwarded headers
        if (("localhost".equals(serverName) || "127.0.0.1".equals(serverName)) && port == 8080) {
            return frontendUrl;
        }

        StringBuilder url = new StringBuilder();
        url.append(scheme).append("://").append(serverName);
        if (port != 80 && port != 443 && port != -1) {
            url.append(":").append(port);
        }
        url.append("/taskmanager/dashboard");
        return url.toString();
    }
}
