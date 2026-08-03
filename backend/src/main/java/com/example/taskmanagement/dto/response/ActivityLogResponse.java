package com.example.taskmanagement.dto.response;

import com.example.taskmanagement.model.ActivityLog;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ActivityLogResponse {
    private Long id;
    private String action;
    private String targetType;
    private Long targetId;
    private String description;
    private LocalDateTime timestamp;
    private Long userId;
    private String username;
    private String userEmail;

    public static ActivityLogResponse from(ActivityLog log) {
        ActivityLogResponse dto = new ActivityLogResponse();
        dto.setId(log.getId());
        dto.setAction(log.getAction().name());
        dto.setTargetType(log.getTargetType());
        dto.setTargetId(log.getTargetId());
        
        String desc = log.getDescription();
        if (log.getUser() != null) {
            dto.setUserId(log.getUser().getId());
            dto.setUsername(log.getUser().getUsername());
            dto.setUserEmail(log.getUser().getEmail());
            
            String actor = log.getUser().getUsername();
            if (desc != null && !desc.isEmpty()) {
                char first = desc.charAt(0);
                if (Character.isUpperCase(first)) {
                    desc = Character.toLowerCase(first) + desc.substring(1);
                }
                desc = actor + " " + desc;
            }
        }
        
        dto.setDescription(desc);
        dto.setTimestamp(log.getTimestamp());
        return dto;
    }
}
