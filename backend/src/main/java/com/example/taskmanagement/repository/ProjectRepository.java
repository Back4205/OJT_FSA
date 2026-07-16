package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * @author Vương Bách
 */
public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByWorkspaceId(Long workspaceId);

    List<Project> findByWorkspaceIdAndLeaderId(Long workspaceId, Long leaderId);

    Optional<Project> findByIdAndWorkspaceId(Long id, Long workspaceId);

    boolean existsByIdAndWorkspaceId(Long id, Long workspaceId);

    @Query("SELECT p FROM Project p WHERE p.workspace.id = :workspaceId AND LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Project> searchByNameInWorkspace(@Param("workspaceId") Long workspaceId,
                                          @Param("keyword") String keyword);
}
