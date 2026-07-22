package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * @author Vương Bách
 */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    @Query("""
            select u
            from User u
            where (:search is null or :search = '' or
                   lower(u.username) like lower(concat('%', :search, '%')) or
                   lower(u.email) like lower(concat('%', :search, '%')))
              and (:active is null or u.isActive = :active)
              and (:superAdmin is null or u.isSuperAdmin = :superAdmin)
            """)
    Page<User> searchAdminUsers(@Param("search") String search,
                                @Param("active") Boolean active,
                                @Param("superAdmin") Boolean superAdmin,
                                Pageable pageable);

    long countByIsActiveTrue();
    long countByIsActiveFalse();
    long countByIsSuperAdminTrue();
    long countByIsSuperAdminFalse();
    long countByIsActiveTrueAndIsSuperAdminTrue();
    long countByIsActiveTrueAndIsSuperAdminFalse();
    long countByIsActiveFalseAndIsSuperAdminTrue();
    long countByIsActiveFalseAndIsSuperAdminFalse();
    long countById(Long id);
    long countByIdAndIsActiveTrue(Long id);
    long countByIdAndIsActiveFalse(Long id);
    long countByIdAndIsSuperAdminTrue(Long id);
    long countByIdAndIsSuperAdminFalse(Long id);
    @Query("""
            select count(u)
            from User u
            where u.isSuperAdmin = false
              and u.createdAt >= :start
              and u.createdAt < :end
            """)
    long countRegularUsersCreatedBetween(@Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end);
}
