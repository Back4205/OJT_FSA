package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.WorkspaceMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface WorkspaceMembershipRepository extends JpaRepository<WorkspaceMembership, Long> {
    List<WorkspaceMembership> findByUserId(Long userId);
    List<WorkspaceMembership> findByUserIdAndIsActive(Long userId, boolean isActive);
    List<WorkspaceMembership> findByUserIdAndIsActiveOrderByIdDesc(Long userId, boolean isActive);
    Optional<WorkspaceMembership> findByUserIdAndWorkspaceId(Long userId, Long workspaceId);
    List<WorkspaceMembership> findByWorkspaceId(Long workspaceId);
    boolean existsByUserIdAndWorkspaceId(Long userId, Long workspaceId);

    Page<WorkspaceMembership> findByUser_Id(Long userId, Pageable pageable);
    Page<WorkspaceMembership> findByWorkspace_Id(Long workspaceId, Pageable pageable);

    @Query("select count(m) from WorkspaceMembership m where m.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);

    @Query("select count(m) from WorkspaceMembership m where m.user.id = :userId and m.isActive = true")
    long countActiveByUserId(@Param("userId") Long userId);

    @Query("select count(m) from WorkspaceMembership m where m.workspace.id = :workspaceId")
    long countByWorkspaceId(@Param("workspaceId") Long workspaceId);

    @Query("select count(m) from WorkspaceMembership m where m.workspace.id = :workspaceId and m.isActive = true")
    long countActiveByWorkspaceId(@Param("workspaceId") Long workspaceId);

    @Query("select count(m) from WorkspaceMembership m where m.isActive = true")
    long countActiveMemberships();

    @Query("select count(m) from WorkspaceMembership m where m.isActive = false")
    long countInactiveMemberships();
}
