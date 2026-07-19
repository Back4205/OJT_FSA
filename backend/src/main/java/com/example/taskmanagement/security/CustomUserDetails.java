package com.example.taskmanagement.security;

import com.example.taskmanagement.model.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

/**
 * Custom UserDetails để lưu trữ thêm context của Workspace đang hoạt động
 * và thông tin đối tượng User gốc đầy đủ.
 */
@Getter
public class CustomUserDetails implements UserDetails {
    private final User user;
    private final Long activeWorkspaceId;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean enabled;

    public CustomUserDetails(User user, Long activeWorkspaceId, Collection<? extends GrantedAuthority> authorities, boolean enabled) {
        this.user = user;
        this.activeWorkspaceId = activeWorkspaceId;
        this.authorities = authorities;
        this.enabled = enabled;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPassword() != null ? user.getPassword() : "";
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
