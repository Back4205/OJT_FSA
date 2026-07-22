package com.example.taskmanagement.dto.response.member;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberWeeklyActivityResponse {
    private String day;
    private int assigned;
    private int completed;
}
