package com.example.taskmanagement.dto.request;

import com.example.taskmanagement.model.enums.TaskPriority;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * @author Vương Bách
 * Request DTO để tạo Task mới trong một Project.
 * Chỉ LEADER hoặc WORKSPACE_ADMIN được dùng endpoint này.
 */
@Getter
@Setter
public class CreateTaskRequest {

    @NotBlank(message = "Tiêu đề task không được để trống")
    @Size(max = 255, message = "Tiêu đề task không được vượt quá 255 ký tự")
    private String title;

    private String description;

    @NotNull(message = "Priority không được để trống")
    private TaskPriority priority;

    @Future(message = "Deadline phải là ngày trong tương lai")
    private LocalDate deadline;

    @NotNull(message = "projectId không được để trống")
    private Long projectId;

    // nullable — task có thể chưa được gán cho ai
    private Long assigneeId;
}
