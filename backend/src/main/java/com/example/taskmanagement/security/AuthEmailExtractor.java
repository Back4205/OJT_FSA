package com.example.taskmanagement.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;

public final class AuthEmailExtractor {

    private AuthEmailExtractor() {
    }

    public static String extractEmail(Authentication authentication) {
        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomOAuth2User customOAuth2User) {
            return customOAuth2User.getEmail();
        }

        if (principal instanceof OAuth2User oauth2User) {
            Object email = oauth2User.getAttributes().get("email");
            if (email != null) {
                return email.toString();
            }
        }

        String name = authentication.getName();
        if (name != null && name.contains(":")) {
            return name.split(":")[0];
        }
        return name;
    }
}
