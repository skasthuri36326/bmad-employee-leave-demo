package demo.leave.request.model;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.util.UUID;

public record LeaveRequest(UUID id, UUID employeeId, LocalDate startDate, LocalDate endDate,
        String reason, String status, OffsetDateTime createdAt, OffsetDateTime decidedAt,
        String employeeName) { }
