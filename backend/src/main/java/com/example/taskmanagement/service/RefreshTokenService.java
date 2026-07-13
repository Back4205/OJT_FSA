package com.example.taskmanagement.service;

import com.example.taskmanagement.model.RefreshToken;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    @Value("${jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    public long getExpirationSeconds() {
        return refreshExpirationMs / 1000;
    }

    private final RefreshTokenRepository refreshTokenRepository;

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    @Transactional
    public RefreshToken createRefreshToken(User user, com.example.taskmanagement.model.Workspace workspace) {
        // Clear previous refresh tokens of the user to avoid accumulation
        refreshTokenRepository.deleteByUser(user);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .workspace(workspace)
                .token(UUID.randomUUID().toString())
                .expiryDate(Instant.now().plusMillis(refreshExpirationMs))
                .revoked(false)
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token was expired. Please sign in again");
        }
        if (token.isRevoked()) {
            throw new RuntimeException("Refresh token is revoked");
        }
        return token;
    }

    @Transactional
    public void revokeToken(String tokenVal) {
        refreshTokenRepository.findByToken(tokenVal).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void deleteTokenByValue(String tokenVal) {
        refreshTokenRepository.deleteByToken(tokenVal);
    }
}
