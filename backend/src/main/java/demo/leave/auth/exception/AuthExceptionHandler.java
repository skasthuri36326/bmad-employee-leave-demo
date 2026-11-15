package demo.leave.auth.exception;

import demo.leave.generated.model.Problem;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AuthExceptionHandler {
    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<Problem> invalidCredentials() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .cacheControl(org.springframework.http.CacheControl.noStore())
            .body(new Problem("about:blank", "Unauthorized", HttpStatus.UNAUTHORIZED.value()));
    }
}
