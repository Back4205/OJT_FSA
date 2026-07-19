package com.example.taskmanagement.dto.response.member;

import com.example.taskmanagement.model.Task;
import com.example.taskmanagement.model.enums.TaskPriority;
import com.example.taskmanagement.model.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberTaskResponse {
    private Long id;
    private String title;
    private String description;
    private String projectName;
    private TaskPriority priority;
    private TaskStatus status;
    private LocalDate deadline;

    public static MemberTaskResponse fromEntity(Task task) {
        return MemberTaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .projectName(task.getProject() != null ? task.getProject().getName() : null)
                .priority(task.getPriority())
                .status(task.getStatus())
                .deadline(task.getDeadline())
                .build();
    }
}
