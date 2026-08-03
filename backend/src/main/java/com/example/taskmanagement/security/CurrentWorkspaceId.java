package com.example.taskmanagement.security;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.lang.annotation.*;

/**

 */
@Target({ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@AuthenticationPrincipal(expression = "#this instanceof T(com.example.taskmanagement.security.CustomUserDetails) ? activeWorkspaceId : null")
public @interface CurrentWorkspaceId {
}
