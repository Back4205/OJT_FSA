package com.example.taskmanagement.config;

import com.example.taskmanagement.model.Role;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.enums.AuthProvider;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.repository.RoleRepository;
import com.example.taskmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Seed roles
        for (RoleName roleName : RoleName.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                Role role = new Role();
                role.setName(roleName);
                roleRepository.save(role);
            }
        }

        // Seed super admin
        String superAdminEmail = "superadmin@platform.com";
        if (userRepository.findByEmail(superAdminEmail).isEmpty()) {
            Role superAdminRole = roleRepository.findByName(RoleName.SUPER_ADMIN)
                    .orElseThrow(() -> new IllegalStateException("SUPER_ADMIN role not seeded"));

            User superAdmin = new User();
            superAdmin.setUsername("superadmin");
            superAdmin.setEmail(superAdminEmail);
            superAdmin.setPassword(passwordEncoder.encode("admin123"));
            superAdmin.setRole(superAdminRole);
            superAdmin.setProvider(AuthProvider.LOCAL);
            superAdmin.setActive(true);

            userRepository.save(superAdmin);
        }
    }
}
