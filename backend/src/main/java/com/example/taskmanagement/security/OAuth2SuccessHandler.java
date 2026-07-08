package com.example.taskmanagement.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * @author Vương Bách
 * Sau khi Google/GitHub xác thực xong -> redirect về FE.
 * Hiện tại dùng session (chưa có JWT), FE sẽ gọi API kèm cookie JSESSIONID để xác thực các request sau.
 */
@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                         Authentication authentication) throws IOException, ServletException {

        // Chưa dùng JWT -> chỉ cần redirect về FE, session đã được Spring Security lưu tự động
        String targetUrl = "http://localhost:5173/taskmanager";
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}