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
public class MemberActivityResponse {
    private String title;
    private String detail;
    private String timeLabel;
    private String tone;
}
