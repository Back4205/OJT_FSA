package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.WorkspaceMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WorkspaceMembershipRepository extends JpaRepository<WorkspaceMembership, Long> {
    List<WorkspaceMembership> findByUserId(Long userId);
    List<WorkspaceMembership> findByUserIdAndIsActive(Long userId, boolean isActive);
    Optional<WorkspaceMembership> findByUserIdAndWorkspaceId(Long userId, Long workspaceId);
    List<WorkspaceMembership> findByWorkspaceId(Long workspaceId);
    boolean existsByUserIdAndWorkspaceId(Long userId, Long workspaceId);
}
