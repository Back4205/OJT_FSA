package com.example.taskmanagement.dto.request;

import com.example.taskmanagement.model.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * @author Vương Bách
 * Request DTO để cập nhật status của Task.
 * MEMBER, LEADER, WORKSPACE_ADMIN đều có thể dùng.
 * Trạng thái hợp lệ: TODO → IN_PROGRESS → REVIEW → DONE (cho phép chuyển linh hoạt).
 */
@Getter
@Setter
public class UpdateTaskStatusRequest {

    @NotNull(message = "Status không được để trống")
    private TaskStatus status;
}
