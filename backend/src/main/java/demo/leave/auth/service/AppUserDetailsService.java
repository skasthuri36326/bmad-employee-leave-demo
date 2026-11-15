package demo.leave.auth.service;

import demo.leave.auth.security.AppUserPrincipal;
import demo.leave.user.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {
    private final UserRepository users;

    public AppUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public AppUserPrincipal loadUserByUsername(String email) throws UsernameNotFoundException {
        return users.findByEmail(email.trim())
            .map(AppUserPrincipal::new)
            .orElseThrow(() -> new UsernameNotFoundException("Account not found"));
    }
}
