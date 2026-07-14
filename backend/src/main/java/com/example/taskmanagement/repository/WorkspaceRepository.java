package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    Optional<Workspace> findByName(String name);
    boolean existsByName(String name);
}
