package demo.leave.request.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import demo.leave.request.model.LeaveRequest;
import demo.leave.request.repository.LeaveRequestRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LeaveRequestServiceTest {
    private LeaveRequestRepository repository;
    private LeaveRequestService service;
    private final UUID owner = UUID.randomUUID();
    @BeforeEach void setup() { repository = mock(LeaveRequestRepository.class); service = new LeaveRequestService(repository, Clock.fixed(Instant.parse("2026-11-15T00:30:00Z"), ZoneOffset.UTC)); }

    @Test void trimsReasonAndUsesPrincipalOwnerAndPendingRepositoryDefaults() {
        LocalDate today = LocalDate.of(2026, 11, 15);
        LeaveRequest saved = new LeaveRequest(UUID.randomUUID(), owner, today, today, "Annual leave", "PENDING", java.time.OffsetDateTime.now(), null, null);
        when(repository.create(owner, today, today, "Annual leave")).thenReturn(saved);
        assertEquals(saved, service.create(owner, today, today, "  Annual leave  "));
        verify(repository).create(owner, today, today, "Annual leave");
    }

    @Test void trimsUnicodeWhitespaceAndRejectsUnicodeWhitespaceOnlyReason() {
        LocalDate today = LocalDate.of(2026, 11, 15);
        LeaveRequest saved = new LeaveRequest(UUID.randomUUID(), owner, today, today, "Annual leave", "PENDING", java.time.OffsetDateTime.now(), null, null);
        when(repository.create(owner, today, today, "Annual leave")).thenReturn(saved);
        assertEquals(saved, service.create(owner, today, today, "\u2003Annual leave\u00a0"));
        assertEquals("reason", assertThrows(LeaveRequestService.LeaveValidationException.class,
            () -> service.create(owner, today, today, "\u2003\u00a0\ufeff")).field());
        verify(repository).create(owner, today, today, "Annual leave");
    }

    @Test void londonCalendarDayMayDifferFromUtcDate() {
        service = new LeaveRequestService(repository, Clock.fixed(Instant.parse("2026-06-01T23:30:00Z"), ZoneOffset.UTC));
        LocalDate londonToday = LocalDate.of(2026, 6, 2);
        when(repository.create(owner, londonToday, londonToday, "x")).thenReturn(new LeaveRequest(UUID.randomUUID(), owner, londonToday, londonToday, "x", "PENDING", java.time.OffsetDateTime.now(), null, null));
        assertDoesNotThrow(() -> service.create(owner, londonToday, londonToday, "x"));
    }

    @Test void rejectsDatesAndReasonBoundariesBeforePersistence() {
        LocalDate today = LocalDate.of(2026, 11, 15);
        assertEquals("startDate", assertThrows(LeaveRequestService.LeaveValidationException.class, () -> service.create(owner, today.minusDays(1), today, "x")).field());
        assertEquals("endDate", assertThrows(LeaveRequestService.LeaveValidationException.class, () -> service.create(owner, today, today.minusDays(1), "x")).field());
        assertEquals("reason", assertThrows(LeaveRequestService.LeaveValidationException.class, () -> service.create(owner, today, today, "  ")).field());
        assertEquals("reason", assertThrows(LeaveRequestService.LeaveValidationException.class, () -> service.create(owner, today, today, "x".repeat(501))).field());
        verifyNoInteractions(repository);
    }

    @Test void rejectsMissingDatesAndNullReasonAndAcceptsMaximumReasonLength() {
        LocalDate today = LocalDate.of(2026, 11, 15);
        assertEquals("startDate", assertThrows(LeaveRequestService.LeaveValidationException.class,
            () -> service.create(owner, null, today, "x")).field());
        assertEquals("endDate", assertThrows(LeaveRequestService.LeaveValidationException.class,
            () -> service.create(owner, today, null, "x")).field());
        assertEquals("reason", assertThrows(LeaveRequestService.LeaveValidationException.class,
            () -> service.create(owner, today, today, null)).field());

        String reason = "x".repeat(500);
        var saved = new LeaveRequest(UUID.randomUUID(), owner, today, today, reason, "PENDING",
            java.time.OffsetDateTime.now(), null, null);
        when(repository.create(owner, today, today, reason)).thenReturn(saved);
        assertEquals(saved, service.create(owner, today, today, reason));
        verify(repository).create(owner, today, today, reason);
    }

    @Test void rejectsUnsupportedDecisionBeforeWriting() {
        assertEquals("decision", assertThrows(LeaveRequestService.LeaveValidationException.class,
            () -> service.decide(UUID.randomUUID(), UUID.randomUUID(), "PENDING")).field());
        assertEquals("decision", assertThrows(LeaveRequestService.LeaveValidationException.class,
            () -> service.decide(UUID.randomUUID(), UUID.randomUUID(), null)).field());
        verifyNoInteractions(repository);
    }

    @Test void reportsConflictIfConditionalWriteSucceedsButRequestCannotBeReloaded() {
        UUID manager = UUID.randomUUID(), requestId = UUID.randomUUID();
        when(repository.decide(eq(requestId), eq(manager), eq("REJECTED"), any())).thenReturn(true);
        when(repository.findManager(requestId, manager)).thenReturn(java.util.Optional.empty());
        assertThrows(java.util.NoSuchElementException.class, () -> service.decide(requestId, manager, "REJECTED"));
    }

    @Test void decisionUsesClockInUtcAndReturnsManagerScopedRequest() {
        UUID manager = UUID.randomUUID(), requestId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 20);
        var saved = new LeaveRequest(requestId, owner, date, date, "Annual leave", "APPROVED",
            java.time.OffsetDateTime.parse("2026-11-15T00:30:00Z"), java.time.OffsetDateTime.parse("2026-11-15T00:30:00Z"), "Alex");
        when(repository.decide(eq(requestId), eq(manager), eq("APPROVED"), any())).thenReturn(true);
        when(repository.findManager(requestId, manager)).thenReturn(java.util.Optional.of(saved));
        assertEquals(saved, service.decide(requestId, manager, "APPROVED"));
        verify(repository).decide(eq(requestId), eq(manager), eq("APPROVED"), eq(java.time.OffsetDateTime.parse("2026-11-15T00:30:00Z")));
    }

    @Test void staleAndOutOfScopeDecisionsAreClassifiedAfterConditionalWrite() {
        UUID manager = UUID.randomUUID(), requestId = UUID.randomUUID();
        when(repository.decide(eq(requestId), eq(manager), eq("REJECTED"), any())).thenReturn(false);
        when(repository.findManager(requestId, manager)).thenReturn(java.util.Optional.empty());
        assertEquals(404, assertThrows(demo.leave.request.controller.LeaveApiException.class,
            () -> service.decide(requestId, manager, "REJECTED")).status());
        LocalDate date = LocalDate.of(2026, 11, 20);
        when(repository.findManager(requestId, manager)).thenReturn(java.util.Optional.of(new LeaveRequest(requestId, owner, date, date, "x", "APPROVED", java.time.OffsetDateTime.now(), java.time.OffsetDateTime.now(), "Alex")));
        assertEquals(409, assertThrows(demo.leave.request.controller.LeaveApiException.class,
            () -> service.decide(requestId, manager, "REJECTED")).status());
    }
}
