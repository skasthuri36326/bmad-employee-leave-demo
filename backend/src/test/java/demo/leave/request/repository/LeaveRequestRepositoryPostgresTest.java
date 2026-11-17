package demo.leave.request.repository;

import static org.junit.jupiter.api.Assertions.*;

import demo.leave.user.model.AppUser;
import demo.leave.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
class LeaveRequestRepositoryPostgresTest {
    @Container static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.7");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", postgres::getJdbcUrl);
        properties.add("spring.datasource.username", postgres::getUsername);
        properties.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired LeaveRequestRepository requests;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;

    private UUID employeeId;
    private UUID otherEmployeeId;
    private UUID managerId;
    private UUID otherManagerId;

    @BeforeEach
    void seedIsolatedRepositoryRows() {
        jdbc.update("DELETE FROM leave_request");
        jdbc.update("DELETE FROM employee_manager_assignment");
        jdbc.update("DELETE FROM app_user");
        employeeId = addUser("EMPLOYEE", "employee@repo.test", "Employee One");
        otherEmployeeId = addUser("EMPLOYEE", "other-employee@repo.test", "Employee Two");
        managerId = addUser("MANAGER", "manager@repo.test", "Manager One");
        otherManagerId = addUser("MANAGER", "other-manager@repo.test", "Manager Two");
        jdbc.update("INSERT INTO employee_manager_assignment(employee_id, manager_id) VALUES (?, ?)", employeeId, managerId);
    }

    @Test
    void createAndFindAreOwnerScopedAndMapPostgresValues() {
        LocalDate start = LocalDate.of(2026, 12, 1);
        var created = requests.create(employeeId, start, start.plusDays(1), "Family event");

        assertNotNull(created.id());
        assertEquals(employeeId, created.employeeId());
        assertEquals(start, created.startDate());
        assertEquals(start.plusDays(1), created.endDate());
        assertEquals("Family event", created.reason());
        assertEquals("PENDING", created.status());
        assertNull(created.decidedAt());
        assertNull(created.employeeName());
        assertEquals(created, requests.findEmployee(created.id(), employeeId).orElseThrow());
        assertTrue(requests.findEmployee(created.id(), otherEmployeeId).isEmpty());
        assertTrue(requests.findEmployee(UUID.randomUUID(), employeeId).isEmpty());
    }

    @Test
    void employeeAndManagerListsStayScopedAndManagerRowsIncludeEmployeeName() {
        LocalDate date = LocalDate.of(2026, 12, 3);
        var assigned = requests.create(employeeId, date, date, "Assigned");
        var unassigned = requests.create(otherEmployeeId, date, date, "Unassigned");

        assertEquals(java.util.List.of(assigned.id()), requests.listEmployee(employeeId).stream().map(r -> r.id()).toList());
        assertEquals(java.util.List.of(unassigned.id()), requests.listEmployee(otherEmployeeId).stream().map(r -> r.id()).toList());
        var managerRows = requests.listManager(managerId);
        assertEquals(java.util.List.of(assigned.id()), managerRows.stream().map(r -> r.id()).toList());
        assertEquals("Employee One", managerRows.getFirst().employeeName());
        assertTrue(requests.listManager(otherManagerId).isEmpty());
        assertEquals("Employee One", requests.findManager(assigned.id(), managerId).orElseThrow().employeeName());
        assertTrue(requests.findManager(unassigned.id(), managerId).isEmpty());
        assertTrue(requests.findManager(assigned.id(), otherManagerId).isEmpty());
    }

    @Test
    void decisionWriteIsAtomicPendingOnlyAndRequiresCurrentAssignment() {
        LocalDate date = LocalDate.of(2026, 12, 5);
        var assigned = requests.create(employeeId, date, date, "Assigned");
        var unassigned = requests.create(otherEmployeeId, date, date, "Unassigned");
        OffsetDateTime decidedAt = OffsetDateTime.parse("2026-11-20T12:34:56Z");

        assertFalse(requests.decide(unassigned.id(), managerId, "APPROVED", decidedAt));
        assertFalse(requests.decide(assigned.id(), otherManagerId, "APPROVED", decidedAt));
        assertTrue(requests.decide(assigned.id(), managerId, "APPROVED", decidedAt));
        assertFalse(requests.decide(assigned.id(), managerId, "REJECTED", decidedAt.plusMinutes(1)));

        var persisted = requests.findManager(assigned.id(), managerId).orElseThrow();
        assertEquals("APPROVED", persisted.status());
        assertEquals(ZoneOffset.UTC, persisted.decidedAt().getOffset());
        assertEquals(decidedAt, persisted.decidedAt());
        assertTrue(requests.findManager(unassigned.id(), managerId).isEmpty());
        assertEquals("PENDING", jdbc.queryForObject("SELECT status FROM leave_request WHERE id = ?", String.class, unassigned.id()));
    }

    @Test
    void userLookupIgnoresEmailCaseAndReturnsEmptyWhenMissing() {
        assertEquals(new AppUser(employeeId, "employee@repo.test", "Employee One", BCRYPT_HASH, "EMPLOYEE"),
            users.findByEmail("EMPLOYEE@REPO.TEST").orElseThrow());
        assertTrue(users.findByEmail("missing@repo.test").isEmpty());
    }

    private static final String BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private UUID addUser(String role, String email, String displayName) {
        return jdbc.queryForObject("INSERT INTO app_user(role, email, display_name, password_hash) VALUES (?, ?, ?, ?) RETURNING id",
            UUID.class, role, email, displayName, BCRYPT_HASH);
    }
}
