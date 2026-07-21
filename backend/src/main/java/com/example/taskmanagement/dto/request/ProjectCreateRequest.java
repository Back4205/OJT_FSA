package com.example.taskmanagement.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectCreateRequest {
    @NotBlank(message = "Tên project không được trống")
    private String name;

    private String description;

    @NotNull(message = "Người dẫn dắt (Leader) không được trống")
    private Long leaderId;

    @NotNull(message = "Giới hạn số lượng thành viên không được trống")
    @Min(value = 1, message = "Số lượng thành viên tối đa phải lớn hơn hoặc bằng 1")
    private Integer maxMembers;
}
