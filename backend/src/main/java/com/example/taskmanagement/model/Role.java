package com.example.taskmanagement.model;

import com.example.taskmanagement.model.enums.RoleName;
import jakarta.persistence.*;
import lombok.*;

/**
 * @author Vương Bách
 */
@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false, unique = true)
    private RoleName name;
}