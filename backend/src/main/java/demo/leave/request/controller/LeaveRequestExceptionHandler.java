package demo.leave.request.controller;

import demo.leave.generated.model.FieldError;
import demo.leave.generated.model.Problem;
import demo.leave.request.service.LeaveRequestService.LeaveValidationException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LeaveRequestExceptionHandler {
    @ExceptionHandler(LeaveApiException.class)
    ResponseEntity<Problem> api(LeaveApiException ex) {
        return ResponseEntity.status(ex.status()).contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .body(new Problem("about:blank", ex.title(), ex.status()).detail(ex.getMessage()));
    }

    @ExceptionHandler(LeaveValidationException.class)
    ResponseEntity<Problem> validation(LeaveValidationException ex) {
        Problem p = new Problem("about:blank", "Bad Request", 400).detail("One or more fields are invalid.");
        p.setErrors(List.of(new FieldError(ex.field(), ex.getMessage())));
        return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_PROBLEM_JSON).body(p);
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Problem> malformed(HttpMessageNotReadableException ex) {
        String field = null;
        for (Throwable cause = ex; cause != null && field == null; cause = cause.getCause()) {
            if (cause instanceof UnrecognizedPropertyException unknown) {
                field = unknown.getPropertyName();
            } else if (cause instanceof JsonMappingException mapping && !mapping.getPath().isEmpty()) {
                List<JsonMappingException.Reference> path = mapping.getPath();
                for (int index = path.size() - 1; index >= 0; index--) {
                    if (path.get(index).getFieldName() != null) {
                        field = path.get(index).getFieldName();
                        break;
                    }
                }
            }
        }
        Problem problem = new Problem("about:blank", "Bad Request", 400).detail("Request body is invalid.");
        if (field != null) problem.setErrors(List.of(new FieldError(field, "Invalid value.")));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .body(problem);
    }
}
