package demo.leave.request.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;

class LeaveRequestExceptionHandlerTest {
    private final LeaveRequestExceptionHandler handler = new LeaveRequestExceptionHandler();

    @Test void mapsApiExceptionIntoProblemDetails() {
        var response = handler.api(new LeaveApiException(404, "Not Found", "Hidden request."));
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Hidden request.", response.getBody().getDetail());
        assertEquals(404, response.getBody().getStatus());
    }

    @Test void mapsValidationExceptionToFieldError() {
        var response = handler.validation(new demo.leave.request.service.LeaveRequestService.LeaveValidationException("reason", "Reason is required."));
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("reason", response.getBody().getErrors().getFirst().getField());
        assertEquals("Reason is required.", response.getBody().getErrors().getFirst().getMessage());
    }

    @Test void malformedBodyFindsUnknownPropertyName() {
        var unknown = UnrecognizedPropertyException.from(mock(JsonParser.class), new Object(), "employeeId", List.of());
        var response = handler.malformed(new HttpMessageNotReadableException("invalid", unknown, null));
        assertEquals("employeeId", response.getBody().getErrors().getFirst().getField());
    }

    @Test void malformedBodyUsesDeepestNamedMappingField() {
        var mapping = JsonMappingException.fromUnexpectedIOE(new java.io.IOException("invalid"));
        mapping.prependPath(new Object(), "startDate");
        var response = handler.malformed(new HttpMessageNotReadableException("invalid", mapping, null));
        assertEquals("startDate", response.getBody().getErrors().getFirst().getField());
    }

    @Test void malformedSyntaxWithoutFieldDoesNotInventFieldError() {
        var response = handler.malformed(new HttpMessageNotReadableException("invalid", new JsonParseException(null, "invalid"), null));
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().getErrors().isEmpty());
    }
}
