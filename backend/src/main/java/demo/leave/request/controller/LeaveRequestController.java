package demo.leave.request.controller;

import demo.leave.auth.security.AppUserPrincipal;
import demo.leave.generated.model.EmployeeLeaveRequest;
import demo.leave.generated.model.DecisionRequest;
import demo.leave.generated.model.GetLeaveRequest200Response;
import demo.leave.generated.model.LeaveRequestList;
import demo.leave.generated.model.LeaveStatus;
import demo.leave.generated.model.ManagerLeaveRequest;
import demo.leave.request.model.LeaveRequest;
import demo.leave.request.service.LeaveRequestService;
import java.net.URI;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LeaveRequestController {
    private final LeaveRequestService service;
    public LeaveRequestController(LeaveRequestService service) { this.service = service; }

    @PostMapping(path = "/api/leave-requests", consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_PROBLEM_JSON_VALUE})
    public ResponseEntity<EmployeeLeaveRequest> createLeaveRequest(@RequestBody demo.leave.generated.model.CreateLeaveRequest body) {
        AppUserPrincipal p = principal();
        if (p == null) throw new LeaveApiException(401, "Unauthorized", "Authentication is required.");
        if (!"EMPLOYEE".equals(p.getRole())) throw new LeaveApiException(403, "Forbidden", "You are not permitted to submit leave requests.");
        LeaveRequest saved = service.create(p.getId(), body == null ? null : body.getStartDate(), body == null ? null : body.getEndDate(), body == null ? null : body.getReason());
        return ResponseEntity.created(URI.create("/api/leave-requests/" + saved.id())).contentType(MediaType.APPLICATION_JSON).body(employee(saved));
    }

    @GetMapping(path = "/api/leave-requests", produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_PROBLEM_JSON_VALUE})
    public ResponseEntity<LeaveRequestList> listLeaveRequests() {
        AppUserPrincipal p = principal();
        if (p == null) throw new LeaveApiException(401, "Unauthorized", "Authentication is required.");
        var items = new java.util.ArrayList<GetLeaveRequest200Response>();
        if ("EMPLOYEE".equals(p.getRole())) service.listEmployee(p.getId()).forEach(r -> items.add(employee(r)));
        else if ("MANAGER".equals(p.getRole())) service.listManager(p.getId()).forEach(r -> items.add(manager(r)));
        else throw new LeaveApiException(403, "Forbidden", "You are not permitted to view leave requests.");
        return ResponseEntity.ok(new LeaveRequestList().items(items));
    }

    @GetMapping(path = "/api/leave-requests/{requestId}", produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_PROBLEM_JSON_VALUE})
    public ResponseEntity<GetLeaveRequest200Response> getLeaveRequest(@PathVariable("requestId") UUID requestId) {
        AppUserPrincipal p = principal();
        if (p == null) throw new LeaveApiException(401, "Unauthorized", "Authentication is required.");
        var found = "EMPLOYEE".equals(p.getRole()) ? service.findEmployee(requestId, p.getId())
            : "MANAGER".equals(p.getRole()) ? service.findManager(requestId, p.getId())
            : throwForbidden();
        if (found.isEmpty()) throw new LeaveApiException(404, "Not Found", "You can't access this leave request.");
        return ResponseEntity.ok("EMPLOYEE".equals(p.getRole()) ? employee(found.get()) : manager(found.get()));
    }

    @PostMapping(path = "/api/leave-requests/{requestId}/decision", consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_PROBLEM_JSON_VALUE})
    public ResponseEntity<ManagerLeaveRequest> decideLeaveRequest(@PathVariable("requestId") UUID requestId, @RequestBody DecisionRequest body) {
        AppUserPrincipal p = principal();
        if (p == null) throw new LeaveApiException(401, "Unauthorized", "Authentication is required.");
        if (!"MANAGER".equals(p.getRole())) throw new LeaveApiException(403, "Forbidden", "You are not permitted to decide leave requests.");
        if (body == null || body.getDecision() == null) throw new LeaveApiException(400, "Bad Request", "A decision is required.");
        return ResponseEntity.ok(manager(service.decide(requestId, p.getId(), body.getDecision().getValue())));
    }

    private java.util.Optional<LeaveRequest> throwForbidden() {
        throw new LeaveApiException(403, "Forbidden", "You are not permitted to view this leave request.");
    }

    private AppUserPrincipal principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AppUserPrincipal p ? p : null;
    }
    private EmployeeLeaveRequest employee(LeaveRequest r) {
        return new EmployeeLeaveRequest(r.id(), r.startDate(), r.endDate(), r.reason(), LeaveStatus.fromValue(r.status()), r.createdAt().withOffsetSameInstant(ZoneOffset.UTC)).decidedAt(utc(r.decidedAt()));
    }
    private ManagerLeaveRequest manager(LeaveRequest r) {
        return new ManagerLeaveRequest(r.id(), r.employeeId(), r.employeeName(), r.startDate(), r.endDate(), r.reason(), LeaveStatus.fromValue(r.status()), r.createdAt().withOffsetSameInstant(ZoneOffset.UTC)).decidedAt(utc(r.decidedAt()));
    }
    private java.time.OffsetDateTime utc(java.time.OffsetDateTime value) {
        return value == null ? null : value.withOffsetSameInstant(ZoneOffset.UTC);
    }
}
