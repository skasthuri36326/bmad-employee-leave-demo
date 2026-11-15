package demo.leave.auth.service;

import demo.leave.auth.security.AppUserPrincipal;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@Service
public class AuthService {
    private static final String INVALID_CREDENTIALS = "Email or password is incorrect";

    private final AppUserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final String dummyPasswordHash;

    public AuthService(AppUserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    public AppUserPrincipal authenticate(String email, String password) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        AppUserPrincipal principal;
        try {
            principal = userDetailsService.loadUserByUsername(normalizedEmail);
        } catch (UsernameNotFoundException exception) {
            passwordEncoder.matches(password == null ? "" : password, dummyPasswordHash);
            throw new BadCredentialsException(INVALID_CREDENTIALS);
        }
        if (!passwordEncoder.matches(password == null ? "" : password, principal.getPassword())) {
            throw new BadCredentialsException(INVALID_CREDENTIALS);
        }
        return principal;
    }
}
