package demo.leave.request.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import demo.leave.auth.security.AppUserPrincipal;
import demo.leave.generated.model.CreateLeaveRequest;
import demo.leave.generated.model.EmployeeLeaveRequest;
import demo.leave.request.model.LeaveRequest;
import demo.leave.request.service.LeaveRequestService;
import demo.leave.user.model.AppUser;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class LeaveRequestControllerTest {
    @Mock private LeaveRequestService service;
    @InjectMocks private LeaveRequestController controller;

    @AfterEach void clearSecurityContext() { SecurityContextHolder.clearContext(); }

    @Test void derivesNewRequestOwnerFromAuthenticatedPrincipal() {
        UUID employeeId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 20);
        AppUser user = new AppUser(employeeId, "employee@example.test", "Employee", "unused", "EMPLOYEE");
        AppUserPrincipal principal = new AppUserPrincipal(user);
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));
        LeaveRequest saved = new LeaveRequest(UUID.randomUUID(), employeeId, date, date, "Annual leave", "PENDING", OffsetDateTime.now(), null, null);
        when(service.create(employeeId, date, date, "  Annual leave  ")).thenReturn(saved);

        var response = controller.createLeaveRequest(new CreateLeaveRequest(date, date, "  Annual leave  "));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(service).create(employeeId, date, date, "  Annual leave  ");
    }

    @Test void mapsRequestTimestampsToUtc() {
        UUID employeeId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        AppUserPrincipal principal = new AppUserPrincipal(new AppUser(employeeId, "employee@example.test", "Employee", "unused", "EMPLOYEE"));
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));
        LocalDate date = LocalDate.of(2026, 11, 20);
        LeaveRequest request = new LeaveRequest(requestId, employeeId, date, date, "Annual leave", "APPROVED",
            OffsetDateTime.parse("2026-11-15T10:00:00+05:00"), OffsetDateTime.parse("2026-11-16T11:00:00+05:00"), null);
        when(service.findEmployee(requestId, employeeId)).thenReturn(java.util.Optional.of(request));

        var response = controller.getLeaveRequest(requestId);

        EmployeeLeaveRequest mapped = (EmployeeLeaveRequest) response.getBody();
        assertEquals(ZoneOffset.UTC, mapped.getCreatedAt().getOffset());
        assertEquals(ZoneOffset.UTC, mapped.getDecidedAt().getOffset());
    }
}
