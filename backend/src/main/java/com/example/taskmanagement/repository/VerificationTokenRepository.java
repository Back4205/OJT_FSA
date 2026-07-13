package com.example.taskmanagement.repository;

import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.VerificationToken;
import com.example.taskmanagement.model.enums.TokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {
    Optional<VerificationToken> findByTokenAndType(String token, TokenType type);
    
    @Modifying
    @Query("DELETE FROM VerificationToken vt WHERE vt.user = :user AND vt.type = :type")
    void deleteByUserAndType(User user, TokenType type);
}
