package com.example.taskmanagement.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "workspace_memberships",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "workspace_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "is_active")
    private boolean isActive = true;
}
