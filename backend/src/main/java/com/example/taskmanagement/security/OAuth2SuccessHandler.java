package com.example.taskmanagement.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                         Authentication authentication) throws IOException, ServletException {
                                              System.out.println("===== LOGIN SUCCESS =====");
    System.out.println(authentication);
    System.out.println(authentication.getClass());
    System.out.println(authentication.getName());
        String targetUrl = "http://localhost:5173/taskmanager/dashboard";
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}