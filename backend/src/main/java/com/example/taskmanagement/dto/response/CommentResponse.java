package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.Comment;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CommentResponse {
    private Long id;
    private String content;
    private LocalDateTime timestamp;
    private Long taskId;
    private Long userId;
    private String username;

    public static CommentResponse from(Comment comment) {
        CommentResponse dto = new CommentResponse();
        dto.setId(comment.getId());
        dto.setContent(comment.getContent());
        dto.setTimestamp(comment.getTimestamp());
        dto.setTaskId(comment.getTask().getId());
        dto.setUserId(comment.getUser().getId());
        dto.setUsername(comment.getUser().getUsername());
        return dto;
    }
}
