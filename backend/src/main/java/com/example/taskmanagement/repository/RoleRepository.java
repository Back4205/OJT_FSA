package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.Role;
import com.example.taskmanagement.model.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * @author Vương Bách
 */
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}