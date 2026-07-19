package com.example.taskmanagement.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity đại diện cho một Workspace/Công ty
 */
@Entity
@Table(name = "workspaces")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Workspace {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "invite_code", unique = true)
    private String inviteCode;
}
