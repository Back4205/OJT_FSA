package com.example.taskmanagement.security;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.lang.annotation.*;

/**
 * Annotation giúp inject trực tiếp workspaceId hiện tại từ SecurityContext vào Controller.
 * Sử dụng SpEL để trích xuất activeWorkspaceId từ CustomUserDetails.
 */
@Target({ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@AuthenticationPrincipal(expression = "#this instanceof T(com.example.taskmanagement.security.CustomUserDetails) ? activeWorkspaceId : null")
public @interface CurrentWorkspaceId {
}
