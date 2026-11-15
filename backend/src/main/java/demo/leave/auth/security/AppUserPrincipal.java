package demo.leave.auth.security;

import demo.leave.user.model.AppUser;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public final class AppUserPrincipal implements UserDetails {
    private final UUID id;
    private final String email;
    private final String displayName;
    private final String passwordHash;
    private final String role;
    private final List<GrantedAuthority> authorities;

    public AppUserPrincipal(AppUser user) {
        this.id = user.id();
        this.email = user.email();
        this.displayName = user.displayName();
        this.passwordHash = user.passwordHash();
        this.role = user.role();
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.role()));
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getRole() { return role; }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
