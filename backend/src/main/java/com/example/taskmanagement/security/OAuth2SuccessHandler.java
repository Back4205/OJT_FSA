package com.example.taskmanagement.security;

import com.example.taskmanagement.model.User;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.service.RefreshTokenService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
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
        String activeRole = user.isSuperAdmin()
                ? com.example.taskmanagement.model.enums.RoleName.SUPER_ADMIN.name()
                : com.example.taskmanagement.model.enums.RoleName.MEMBER.name();

        if (!user.isSuperAdmin() && !memberships.isEmpty()) {
            var defaultMembership = memberships.get(0);
            workspaceId = defaultMembership.getWorkspace().getId();
            activeWorkspace = defaultMembership.getWorkspace();
            activeRole = defaultMembership.getRole().getName().name();
        }

        String token = jwtService.generateToken(user.getEmail(), activeRole, workspaceId);
        cookieUtil.addTokenCookie(response, token, jwtService.getExpirationSeconds());

        var refreshToken = refreshTokenService.createRefreshToken(user, activeWorkspace);
        cookieUtil.addRefreshTokenCookie(response, refreshToken.getToken(), refreshTokenService.getExpirationSeconds());

        // --- Determine the correct redirect target ---
        // Priority 1: redirect_uri cookie saved by the frontend before starting the OAuth2 flow.
        //             This carries the actual origin (ngrok URL / LAN IP / localhost) that the
        //             user's browser is using, so we always land on the right host.
        // Priority 2: Reconstruct the URL from the current request (works when ForwardedHeaderFilter
        //             is active and the proxy forwards X-Forwarded-Host / X-Forwarded-Proto).
        // Priority 3: Fallback to the static property (localhost – only correct for local dev).
        String targetUrl = readRedirectUriCookie(request);

        if (targetUrl == null || targetUrl.isBlank()) {
            targetUrl = reconstructFrontendUrl(request);
        }

        if (targetUrl == null || targetUrl.isBlank()) {
            targetUrl = frontendUrl;
        }

        httpCookieOAuth2AuthorizationRequestRepository.removeAuthorizationRequestCookies(request, response);
        cookieUtil.clearJSessionIdCookie(response);

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    /**
     * Read the {@code redirect_uri} cookie saved by the browser when the user clicked
     * "Login with Google/GitHub". The frontend sets this to {@code window.location.origin +
     * "/taskmanager/dashboard"} which is the exact origin the user is browsing from.
     */
    private String readRedirectUriCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (HttpCookieOAuth2AuthorizationRequestRepository.REDIRECT_URI_PARAM_COOKIE_NAME
                    .equals(cookie.getName())) {
                String value = cookie.getValue();
                return (value != null && !value.isBlank()) ? value : null;
            }
        }
        return null;
    }

    /**
     * Build the frontend dashboard URL from the incoming request's scheme and host.
     * When {@code ForwardedHeaderFilter} is active, Spring already rewrites the request
     * so that {@code request.getScheme()} and {@code request.getServerName()} reflect the
     * values coming from {@code X-Forwarded-Proto} / {@code X-Forwarded-Host} (i.e. the
     * ngrok domain), not the internal "localhost:8080".
     */
    private String reconstructFrontendUrl(HttpServletRequest request) {
        try {
            String scheme = request.getScheme();           // "https" via ngrok
            String host   = request.getServerName();       // "xxxx.ngrok-free.app"
            int    port   = request.getServerPort();

            StringBuilder url = new StringBuilder();
            url.append(scheme).append("://").append(host);

            // Omit the default ports so the URL stays clean.
            boolean isDefaultPort = ("https".equals(scheme) && port == 443)
                                 || ("http".equals(scheme)  && port == 80);
            if (!isDefaultPort && port > 0) {
                url.append(":").append(port);
            }

            url.append("/taskmanager/dashboard");
            return url.toString();
        } catch (Exception e) {
            return null;
        }
    }
}
