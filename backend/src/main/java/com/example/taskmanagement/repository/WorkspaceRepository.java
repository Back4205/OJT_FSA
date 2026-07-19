package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    Optional<Workspace> findByName(String name);
    boolean existsByName(String name);
    @Query("""
            select w
            from Workspace w
            where (:search is null or :search = '' or
                   lower(w.name) like lower(concat('%', :search, '%')) or
                   lower(coalesce(w.description, '')) like lower(concat('%', :search, '%')))
              and (:active is null or w.active = :active)
            """)
    Page<Workspace> searchAdminWorkspaces(@Param("search") String search,
                                          @Param("active") Boolean active,
                                          Pageable pageable);

    long countByActiveTrue();
    long countByActiveFalse();

    Optional<Workspace> findByInviteCode(String inviteCode);
}
