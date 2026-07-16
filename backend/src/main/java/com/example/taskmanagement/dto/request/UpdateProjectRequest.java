package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * @author Vương Bách
 * Request DTO để cập nhật thông tin Project.
 * Tất cả fields đều optional — chỉ update field nào được truyền vào (non-null).
 */
@Getter
@Setter
public class UpdateProjectRequest {

    @Size(max = 255, message = "Tên project không được vượt quá 255 ký tự")
    private String name;

    private String description;
}
