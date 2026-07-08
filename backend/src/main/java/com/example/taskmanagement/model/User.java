package com.example.taskmanagement.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashSet;
import java.util.Set;
import com.example.taskmanagement.model.enums.AuthProvider;

/**
 * @author Vương Bách
 */
@Entity
@Table(
    name = "users",
    uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "provider_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Tương đương IDENTITY(1,1) trong MSSQL
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column
    private String password;

    @Column(nullable = false, unique = true)
    private String email;
    @Enumerated(EnumType.STRING)
@Column(nullable = false, length = 20)
private AuthProvider provider = AuthProvider.LOCAL;

@Column(name = "provider_id")
private String providerId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "is_active")
    private boolean isActive = true; // Phục vụ tính năng Khóa/Mở khóa User

    @ManyToMany(mappedBy = "members")
    private Set<Project> projects = new HashSet<>();

}