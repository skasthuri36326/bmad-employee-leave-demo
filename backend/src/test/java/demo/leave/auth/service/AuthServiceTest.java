package demo.leave.auth.service;

import demo.leave.auth.security.AppUserPrincipal;
import demo.leave.user.model.AppUser;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.anyString;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock
    private AppUserDetailsService users;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        when(passwordEncoder.encode(anyString())).thenReturn("dummy-password-hash");
        authService = new AuthService(users, passwordEncoder);
    }

    @Test
    void authenticatesWithStoredHashAndReturnsTheStoredManagerRole() {
        UUID id = UUID.fromString("ae76b2c8-cad2-4e34-a2aa-8df634809402");
        AppUserPrincipal account = new AppUserPrincipal(new AppUser(id, "manager@example.test", "Demo Manager", "$2a$10$stored-hash", "MANAGER"));
        when(users.loadUserByUsername("manager@example.test")).thenReturn(account);
        when(passwordEncoder.matches("correct-password", account.getPassword())).thenReturn(true);

        AppUserPrincipal principal = authService.authenticate("manager@example.test", "correct-password");

        assertEquals(id, principal.getId());
        assertEquals("MANAGER", principal.getRole());
        assertEquals("ROLE_MANAGER", principal.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void rejectsAnIncorrectPasswordWithGenericAuthenticationFailure() {
        AppUserPrincipal account = new AppUserPrincipal(new AppUser(UUID.randomUUID(), "employee@example.test", "Demo Employee", "$2a$10$stored-hash", "EMPLOYEE"));
        when(users.loadUserByUsername("employee@example.test")).thenReturn(account);
        when(passwordEncoder.matches("incorrect", account.getPassword())).thenReturn(false);

        assertThrows(BadCredentialsException.class,
            () -> authService.authenticate("employee@example.test", "incorrect"));
    }

    @Test
    void rejectsUnknownEmailWithTheSameAuthenticationFailure() {
        when(users.loadUserByUsername("unknown@example.test")).thenThrow(new UsernameNotFoundException("Account not found"));

        assertThrows(BadCredentialsException.class,
            () -> authService.authenticate("unknown@example.test", "any-password"));

        verify(passwordEncoder).matches("any-password", "dummy-password-hash");
    }
}
