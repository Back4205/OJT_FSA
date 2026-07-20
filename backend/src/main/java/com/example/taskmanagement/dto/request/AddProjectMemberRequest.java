package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * @author Vương Bách
 * Request DTO để thêm một member (từ workspace) vào một Project.
 */
@Getter
@Setter
public class AddProjectMemberRequest {

    @NotNull(message = "memberId không được để trống")
    private Long memberId; // userId của user cần thêm vào project
}
