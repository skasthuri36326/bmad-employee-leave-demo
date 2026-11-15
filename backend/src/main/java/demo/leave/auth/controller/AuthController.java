package demo.leave.auth.controller;

import demo.leave.auth.security.AppUserPrincipal;
import demo.leave.auth.service.AuthService;
import demo.leave.generated.api.AuthenticationApi;
import demo.leave.generated.model.CurrentUser;
import demo.leave.generated.model.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class AuthController implements AuthenticationApi {
    private final AuthService authService;
    private final CsrfTokenRepository csrfTokenRepository;
    private final SecurityContextRepository securityContextRepository;
    private final boolean secureSessionCookie;
    private final String sessionCookieName;

    public AuthController(
            AuthService authService,
            CsrfTokenRepository csrfTokenRepository,
            SecurityContextRepository securityContextRepository,
            @Value("${server.servlet.session.cookie.secure:false}") boolean secureSessionCookie,
            @Value("${server.servlet.session.cookie.name:LEAVESESSION}") String sessionCookieName) {
        this.authService = authService;
        this.csrfTokenRepository = csrfTokenRepository;
        this.securityContextRepository = securityContextRepository;
        this.secureSessionCookie = secureSessionCookie;
        this.sessionCookieName = sessionCookieName;
    }

    @Override
    public ResponseEntity<demo.leave.generated.model.CsrfToken> getCsrfToken() {
        HttpServletRequest request = request();
        CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (token == null) {
            throw new IllegalStateException("CSRF filter did not provide a token");
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new demo.leave.generated.model.CsrfToken()
            .headerName(demo.leave.generated.model.CsrfToken.HeaderNameEnum.X_CSRF_TOKEN)
            .token(token.getToken()));
    }

    @Override
    public ResponseEntity<CurrentUser> login(demo.leave.generated.model.LoginRequest loginRequest) {
        if (loginRequest == null || loginRequest.getEmail() == null || loginRequest.getPassword() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        HttpServletRequest request = request();
        HttpServletResponse response = response();
        AppUserPrincipal principal = authService.authenticate(loginRequest.getEmail(), loginRequest.getPassword());

        request.changeSessionId();
        csrfTokenRepository.saveToken(null, request, response);

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
            principal, null, principal.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(toCurrentUser(principal));
    }

    @Override
    public ResponseEntity<CurrentUser> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(toCurrentUser(principal));
    }

    @Override
    public ResponseEntity<Void> logout() {
        HttpServletRequest request = request();
        HttpServletResponse response = response();
        csrfTokenRepository.saveToken(null, request, response);
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
        SecurityContextHolder.clearContext();

        ResponseCookie clearedCookie = ResponseCookie.from(sessionCookieName, "")
            .path("/")
            .httpOnly(true)
            .sameSite("Lax")
            .secure(secureSessionCookie)
            .maxAge(Duration.ZERO)
            .build();
        return ResponseEntity.noContent()
            .cacheControl(CacheControl.noStore())
            .header(HttpHeaders.SET_COOKIE, clearedCookie.toString())
            .build();
    }

    private CurrentUser toCurrentUser(AppUserPrincipal principal) {
        return new CurrentUser(principal.getId(), principal.getEmail(), principal.getDisplayName(),
            Role.fromValue(principal.getRole()));
    }

    private HttpServletRequest request() {
        return ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
    }

    private HttpServletResponse response() {
        return Objects.requireNonNull(
            ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getResponse(),
            "HTTP response is required for authentication operations");
    }
}
