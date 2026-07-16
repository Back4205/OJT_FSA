package com.example.taskmanagement.dto.request;

import com.example.taskmanagement.model.enums.TaskPriority;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * @author Vương Bách
 * Request DTO để cập nhật Task.
 * Tất cả fields đều optional — chỉ update field nào non-null.
 */
@Getter
@Setter
public class UpdateTaskRequest {

    @Size(max = 255, message = "Tiêu đề task không được vượt quá 255 ký tự")
    private String title;

    private String description;

    private TaskPriority priority;

    private LocalDate deadline;

    // null = giữ nguyên assignee; -1 = bỏ assignee (unassign)
    private Long assigneeId;
}
