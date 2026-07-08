package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.request.LoginRequest;
import com.example.taskmanagement.dto.request.RegisterRequest;
import com.example.taskmanagement.dto.response.UserResponse;
import com.example.taskmanagement.model.Role;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.enums.AuthProvider;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.repository.RoleRepository;
import com.example.taskmanagement.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * @author Vương Bách
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use");
        }

        Role memberRole = roleRepository.findByName(RoleName.MEMBER)
                .orElseThrow(() -> new IllegalStateException("Role MEMBER has not been seeded in the database"));

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(memberRole);
        user.setProvider(AuthProvider.LOCAL);
        user.setActive(true);

        userRepository.save(user);
        return UserResponse.fromEntity(user);
    }

    @Override
    public UserResponse login(LoginRequest request, HttpServletRequest httpServletRequest) {
        User user = userRepository.findByUsername(request.getEmail())
                .orElseGet(() -> userRepository.findByEmail(request.getEmail())
                 .orElseThrow(() -> new BadCredentialsException("Invalid username or password")));

        if (user.getProvider() != AuthProvider.LOCAL) {
            throw new BadCredentialsException(
                    "This account was registered via " + user.getProvider() + ". Please log in using " + user.getProvider() + ".");
        }

        if (!user.isActive()) {
            throw new BadCredentialsException("This account has been locked. Please contact an Admin");
        }

        // Authenticate via AuthenticationManager (uses UserDetailsServiceImpl + configured PasswordEncoder)
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getEmail(), request.getPassword())
        );

        // Store Authentication into SecurityContext + Session (session-based for now, JWT not added yet)
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        HttpSession session = httpServletRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        return UserResponse.fromEntity(user);
    }

    @Override
    public UserResponse getCurrentUserByEmail(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null) {
            throw new IllegalStateException("User does not exist");
        }
        
        return UserResponse.fromEntity(user);
    }
}
