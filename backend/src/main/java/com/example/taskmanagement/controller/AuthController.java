package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.request.LoginRequest;
import com.example.taskmanagement.dto.request.RegisterRequest;
import com.example.taskmanagement.dto.response.ApiResponse;
import com.example.taskmanagement.dto.response.UserResponse;
import com.example.taskmanagement.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import com.example.taskmanagement.security.CustomOAuth2User;

/**
 * @author Vương Bách
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

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
    public ResponseEntity<ApiResponse<UserResponse>> login(@Valid @RequestBody LoginRequest request,
                                                            HttpServletRequest httpServletRequest) {
        try {
            UserResponse response = authService.login(request, httpServletRequest);
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/logout")
public ResponseEntity<ApiResponse<Void>> logout(
        HttpServletRequest request,
        HttpServletResponse response) {

    HttpSession session = request.getSession(false);
    if (session != null) {
        session.invalidate();
    }

    SecurityContextHolder.clearContext();

    Cookie cookie = new Cookie("JSESSIONID", null);
    cookie.setPath("/taskmanager");          // hoặc "/taskmanager"
    cookie.setHttpOnly(true);
    cookie.setMaxAge(0);          // xóa ngay

    response.addCookie(cookie);

    return ResponseEntity.ok(
            ApiResponse.success("Logout successful", null));
}

//    @GetMapping("/me")
// public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
//     Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
//     System.out.println("===========================");
//     System.out.println(authentication);
//     System.out.println(authentication.getName());
//     if (authentication == null || !authentication.isAuthenticated()) {
//         return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
//                 .body(ApiResponse.error("Not logged in"));
//     }
    
//     try {
//         UserResponse response = authService.getCurrentUser(authentication.getName());
//         return ResponseEntity.ok(ApiResponse.success("OK", response));
//     } catch ( IllegalStateException e) {
//         // User không tồn tại trong DB - xóa session và trả 401
//         SecurityContextHolder.clearContext();
//         return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
//                 .body(ApiResponse.error("User not found or session expired"));
//     }
// }
@GetMapping("/me")
public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
        Authentication authentication) {

    if (authentication == null || !authentication.isAuthenticated()) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Not logged in"));
    }

    String email;

    if (authentication.getPrincipal() instanceof CustomOAuth2User  oauth2User) {

        email =  oauth2User.getEmail();

    } else {

        email = authentication.getName();

    }

    UserResponse response =
            authService.getCurrentUserByEmail(email);

    return ResponseEntity.ok(
            ApiResponse.success("OK", response));
}
}