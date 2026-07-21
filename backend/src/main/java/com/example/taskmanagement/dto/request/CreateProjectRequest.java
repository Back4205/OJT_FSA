package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * @author Vương Bách
 * Request DTO để tạo Project mới.
 * workspaceId KHÔNG nhận từ body — lấy từ JWT claim.
 */
@Getter
@Setter
public class CreateProjectRequest {

    @NotBlank(message = "Tên project không được để trống")
    @Size(max = 255, message = "Tên project không được vượt quá 255 ký tự")
    private String name;

    private String description;

    private Integer maxMembers;
}
