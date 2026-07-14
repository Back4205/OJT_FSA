package com.example.taskmanagement.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {

    @Value("${jwt.cookie-name}")
    private String cookieName;

    @Value("${jwt.cookie-path}")
    private String cookiePath;

    @Value("${jwt.cookie-secure}")
    private boolean cookieSecure;

    public void addTokenCookie(jakarta.servlet.http.HttpServletResponse response, String token, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from(cookieName, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .path(cookiePath)
                .sameSite("Lax")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void clearTokenCookie(jakarta.servlet.http.HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(cookieName, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path(cookiePath)
                .sameSite("Lax")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public String extractTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public void addRefreshTokenCookie(jakarta.servlet.http.HttpServletResponse response, String token, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .path(cookiePath)
                .sameSite("Lax")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void clearRefreshTokenCookie(jakarta.servlet.http.HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path(cookiePath)
                .sameSite("Lax")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public String extractRefreshTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if ("refresh_token".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    // public void clearJSessionIdCookie(jakarta.servlet.http.HttpServletResponse response) {
    //     ResponseCookie cookie = ResponseCookie.from("JSESSIONID", "")
    //             .httpOnly(true)
    //             .secure(cookieSecure)
    //             .path(cookiePath)
    //             .sameSite("Lax")
    //             .maxAge(0)
    //             .build();
    //     response.addHeader("Set-Cookie", cookie.toString());

    //     // Also clear JSESSIONID on root path just in case
    //     ResponseCookie rootCookie = ResponseCookie.from("JSESSIONID", "")
    //             .httpOnly(true)
    //             .secure(cookieSecure)
    //             .path("/")
    //             .sameSite("Lax")
    //             .maxAge(0)
    //             .build();
    //     response.addHeader("Set-Cookie", rootCookie.toString());
    // }
}
