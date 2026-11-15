package demo.leave.request.service;

import demo.leave.request.model.LeaveRequest;
import demo.leave.request.repository.LeaveRequestRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeaveRequestService {
    private static final ZoneId ZONE = ZoneId.of("Europe/London");
    private final LeaveRequestRepository repository;
    private final Clock clock;
    public LeaveRequestService(LeaveRequestRepository repository, Clock clock) { this.repository = repository; this.clock = clock; }

    public LeaveRequest create(UUID employeeId, LocalDate start, LocalDate end, String reason) {
        if (start == null || start.isBefore(LocalDate.now(clock.withZone(ZONE)))) throw new LeaveValidationException("startDate", "Start date must be today or later.");
        if (end == null || start != null && end.isBefore(start)) throw new LeaveValidationException("endDate", "End date must be the same as or later than the start date.");
        String trimmed = reason == null ? "" : trimReasonWhitespace(reason);
        if (trimmed.isEmpty()) throw new LeaveValidationException("reason", "Enter a reason for requesting leave.");
        if (trimmed.length() > 500) throw new LeaveValidationException("reason", "Reason must be 500 characters or fewer.");
        return repository.create(employeeId, start, end, trimmed);
    }

    private static String trimReasonWhitespace(String value) {
        int start = 0;
        int end = value.length();
        while (start < end) {
            int codePoint = value.codePointAt(start);
            if (!isReasonWhitespace(codePoint)) break;
            start += Character.charCount(codePoint);
        }
        while (start < end) {
            int codePoint = value.codePointBefore(end);
            if (!isReasonWhitespace(codePoint)) break;
            end -= Character.charCount(codePoint);
        }
        return value.substring(start, end);
    }

    private static boolean isReasonWhitespace(int codePoint) {
        return Character.isWhitespace(codePoint) || Character.isSpaceChar(codePoint) || codePoint == 0xFEFF;
    }

    public List<LeaveRequest> listEmployee(UUID id) { return repository.listEmployee(id); }
    public List<LeaveRequest> listManager(UUID id) { return repository.listManager(id); }
    public java.util.Optional<LeaveRequest> findEmployee(UUID requestId, UUID id) { return repository.findEmployee(requestId, id); }
    public java.util.Optional<LeaveRequest> findManager(UUID requestId, UUID id) { return repository.findManager(requestId, id); }

    @Transactional
    public LeaveRequest decide(UUID requestId, UUID managerId, String decision) {
        if (!"APPROVED".equals(decision) && !"REJECTED".equals(decision)) {
            throw new LeaveValidationException("decision", "Choose Approved or Rejected.");
        }
        OffsetDateTime decidedAt = OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC);
        if (repository.decide(requestId, managerId, decision, decidedAt)) {
            return repository.findManager(requestId, managerId).orElseThrow();
        }
        var current = repository.findManager(requestId, managerId);
        if (current.isEmpty()) throw new demo.leave.request.controller.LeaveApiException(404, "Not Found", "You can't access this leave request.");
        throw new demo.leave.request.controller.LeaveApiException(409, "Conflict", "This leave request has already been decided.");
    }

    public static class LeaveValidationException extends RuntimeException {
        private final String field;
        public LeaveValidationException(String field, String message) { super(message); this.field = field; }
        public String field() { return field; }
    }
}
