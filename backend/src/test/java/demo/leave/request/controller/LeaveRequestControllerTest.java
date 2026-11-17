package demo.leave.request.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;

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

    @Test void requiresEmployeeAuthenticationForCreateAndRejectsOtherRoles() {
        SecurityContextHolder.clearContext();
        assertThrows(LeaveApiException.class, () -> controller.createLeaveRequest(new CreateLeaveRequest()));

        var manager = new AppUserPrincipal(new AppUser(UUID.randomUUID(), "manager@example.test", "Manager", "unused", "MANAGER"));
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(manager, null, manager.getAuthorities()));
        assertThrows(LeaveApiException.class, () -> controller.createLeaveRequest(new CreateLeaveRequest()));
        verify(service, never()).create(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test void listsEmployeeAndManagerViewsAndRejectsUnknownRoles() {
        var employee = new AppUserPrincipal(new AppUser(UUID.randomUUID(), "employee@example.test", "Employee", "unused", "EMPLOYEE"));
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(employee, null, employee.getAuthorities()));
        when(service.listEmployee(employee.getId())).thenReturn(java.util.List.of());
        assertEquals(HttpStatus.OK, controller.listLeaveRequests().getStatusCode());
        verify(service).listEmployee(employee.getId());

        var manager = new AppUserPrincipal(new AppUser(UUID.randomUUID(), "manager@example.test", "Manager", "unused", "MANAGER"));
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(manager, null, manager.getAuthorities()));
        when(service.listManager(manager.getId())).thenReturn(java.util.List.of());
        assertEquals(HttpStatus.OK, controller.listLeaveRequests().getStatusCode());
        verify(service).listManager(manager.getId());

        var unknown = new AppUserPrincipal(new AppUser(UUID.randomUUID(), "unknown@example.test", "Unknown", "unused", "AUDITOR"));
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(unknown, null, unknown.getAuthorities()));
        assertThrows(LeaveApiException.class, controller::listLeaveRequests);
    }

    @Test void getAndDecisionGuardAuthenticationAndRoleBeforeCallingService() {
        UUID requestId = UUID.randomUUID();
        SecurityContextHolder.clearContext();
        assertThrows(LeaveApiException.class, () -> controller.getLeaveRequest(requestId));
        assertThrows(LeaveApiException.class, () -> controller.decideLeaveRequest(requestId, null));

        var employee = new AppUserPrincipal(new AppUser(UUID.randomUUID(), "employee@example.test", "Employee", "unused", "EMPLOYEE"));
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(employee, null, employee.getAuthorities()));
        assertThrows(LeaveApiException.class, () -> controller.getLeaveRequest(requestId));
        assertThrows(LeaveApiException.class, () -> controller.decideLeaveRequest(requestId, null));
        verify(service, never()).decide(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test void managerDecisionRequiresAValueAndMapsTheManagerResponse() {
        UUID managerId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        var manager = new AppUserPrincipal(new AppUser(managerId, "manager@example.test", "Manager", "unused", "MANAGER"));
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(manager, null, manager.getAuthorities()));
        assertThrows(LeaveApiException.class, () -> controller.decideLeaveRequest(requestId, null));
        assertThrows(LeaveApiException.class, () -> controller.decideLeaveRequest(requestId, new demo.leave.generated.model.DecisionRequest()));

        LocalDate date = LocalDate.of(2026, 11, 20);
        LeaveRequest saved = new LeaveRequest(requestId, UUID.randomUUID(), date, date, "Annual leave", "APPROVED",
            OffsetDateTime.parse("2026-11-15T10:00:00+05:00"), OffsetDateTime.parse("2026-11-16T11:00:00+05:00"), "Employee");
        when(service.decide(requestId, managerId, "APPROVED")).thenReturn(saved);
        var response = controller.decideLeaveRequest(requestId, new demo.leave.generated.model.DecisionRequest(demo.leave.generated.model.Decision.APPROVED));
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(ZoneOffset.UTC, response.getBody().getCreatedAt().getOffset());
        assertEquals(ZoneOffset.UTC, response.getBody().getDecidedAt().getOffset());
    }
}
