package demo.leave.integration.request;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import demo.leave.auth.security.AppUserPrincipal;
import demo.leave.request.model.LeaveRequest;
import demo.leave.user.model.AppUser;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import demo.leave.request.service.LeaveRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class LeaveRequestApiIntegrationTest {
    @Container static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.7");
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper objectMapper;
    @Autowired LeaveRequestService service;
    UUID employeeId, otherEmployeeId, managerId, otherManagerId;

    @BeforeEach void users() {
        jdbc.update("DELETE FROM leave_request"); jdbc.update("DELETE FROM employee_manager_assignment"); jdbc.update("DELETE FROM app_user");
        employeeId = addUser("EMPLOYEE", "alex@example.test");
        otherEmployeeId = addUser("EMPLOYEE", "other@example.test");
        managerId = addUser("MANAGER", "manager@example.test");
        otherManagerId = addUser("MANAGER", "other-manager@example.test");
        jdbc.update("INSERT INTO employee_manager_assignment(employee_id, manager_id) VALUES (?, ?)", employeeId, managerId);
    }

    @Test void employeeCreatesListsReadsAndCannotReadAnotherEmployeesRequest() throws Exception {
        String request = "{\"startDate\":\"" + LocalDate.now().plusDays(3) + "\",\"endDate\":\"" + LocalDate.now().plusDays(3) + "\",\"reason\":\"  Family event  \"}";
        String created = mvc.perform(post("/api/leave-requests").with(authentication(auth(employeeId,"EMPLOYEE"))).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.reason").value("Family event")).andExpect(jsonPath("$.status").value("PENDING")).andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("id").asText();
        org.junit.jupiter.api.Assertions.assertEquals(employeeId,
            jdbc.queryForObject("SELECT employee_id FROM leave_request WHERE id = ?", UUID.class, UUID.fromString(id)));
        mvc.perform(get("/api/leave-requests").with(authentication(auth(employeeId,"EMPLOYEE"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(get("/api/leave-requests/" + id).with(authentication(auth(employeeId,"EMPLOYEE"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.reason").value("Family event"));
        mvc.perform(get("/api/leave-requests/" + id).with(authentication(auth(otherEmployeeId,"EMPLOYEE"))))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").value("You can't access this leave request."));
    }

    @Test void invalidAndSpoofedCreateRequestsDoNotPersistAndManagerIsForbidden() throws Exception {
        String future = LocalDate.now().plusDays(2).toString();
        for (String body : new String[]{"{\"startDate\":\""+future+"\",\"endDate\":\""+future+"\",\"reason\":\"   \"}", "{\"startDate\":\""+future+"\",\"endDate\":\""+future+"\",\"reason\":\"x\",\"employeeId\":\""+employeeId+"\"}", "{\"startDate\":\""+future+"\",\"endDate\":\""+future+"\",\"reason\":\"x\",\"status\":\"APPROVED\"}"}) {
            mvc.perform(post("/api/leave-requests").with(authentication(auth(employeeId,"EMPLOYEE"))).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/leave-requests").with(authentication(auth(managerId,"MANAGER"))).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"startDate\":\""+future+"\",\"endDate\":\""+future+"\",\"reason\":\"x\"}"))
            .andExpect(status().isForbidden());
        org.junit.jupiter.api.Assertions.assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM leave_request", Integer.class));
    }

    @Test void malformedDateAndUnknownFieldsIdentifyTheirField() throws Exception {
        String future = LocalDate.now().plusDays(2).toString();
        mvc.perform(post("/api/leave-requests").with(authentication(auth(employeeId,"EMPLOYEE"))).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"startDate\":\"not-a-date\",\"endDate\":\"" + future + "\",\"reason\":\"x\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("startDate"));
        mvc.perform(post("/api/leave-requests").with(authentication(auth(employeeId,"EMPLOYEE"))).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"startDate\":\"" + future + "\",\"endDate\":\"" + future + "\",\"reason\":\"x\",\"employeeId\":\"" + employeeId + "\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("employeeId"));
        org.junit.jupiter.api.Assertions.assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM leave_request", Integer.class));
    }

    @Test void managerListIsAssignmentScoped() throws Exception {
        String body = "{\"startDate\":\""+LocalDate.now().plusDays(3)+"\",\"endDate\":\""+LocalDate.now().plusDays(3)+"\",\"reason\":\"x\"}";
        mvc.perform(post("/api/leave-requests").with(authentication(auth(employeeId,"EMPLOYEE"))).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());
        mvc.perform(get("/api/leave-requests").with(authentication(auth(managerId,"MANAGER")))).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(get("/api/leave-requests").with(authentication(auth(otherManagerId,"MANAGER")))).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test void managerRequestOperationsRequireAuthenticationAndMissingDecisionIsNonDisclosing() throws Exception {
        UUID missingRequestId = UUID.randomUUID();
        mvc.perform(get("/api/leave-requests")).andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.id").doesNotExist()).andExpect(jsonPath("$.reason").doesNotExist());
        mvc.perform(get("/api/leave-requests/" + missingRequestId)).andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.id").doesNotExist()).andExpect(jsonPath("$.reason").doesNotExist());
        mvc.perform(post("/api/leave-requests/" + missingRequestId + "/decision").with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"APPROVED\"}"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.id").doesNotExist()).andExpect(jsonPath("$.reason").doesNotExist());

        mvc.perform(post("/api/leave-requests/" + missingRequestId + "/decision").with(authentication(auth(managerId,"MANAGER"))).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"APPROVED\"}"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").value("You can't access this leave request."))
            .andExpect(jsonPath("$.id").doesNotExist()).andExpect(jsonPath("$.reason").doesNotExist());
    }

    @Test void unassignedEmployeesRequestIsHiddenFromManagerListAndOperations() throws Exception {
        UUID assignedRequestId = insertRequest(employeeId);
        UUID unassignedRequestId = insertRequest(otherEmployeeId);

        mvc.perform(get("/api/leave-requests").with(authentication(auth(managerId,"MANAGER"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(assignedRequestId.toString()));
        mvc.perform(get("/api/leave-requests/" + unassignedRequestId).with(authentication(auth(managerId,"MANAGER"))))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").value("You can't access this leave request."))
            .andExpect(jsonPath("$.id").doesNotExist()).andExpect(jsonPath("$.reason").doesNotExist());
        mvc.perform(post("/api/leave-requests/" + unassignedRequestId + "/decision").with(authentication(auth(managerId,"MANAGER"))).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"APPROVED\"}"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").value("You can't access this leave request."))
            .andExpect(jsonPath("$.id").doesNotExist()).andExpect(jsonPath("$.reason").doesNotExist());
        org.junit.jupiter.api.Assertions.assertEquals("PENDING", jdbc.queryForObject("SELECT status FROM leave_request WHERE id = ?", String.class, unassignedRequestId));
    }

    @Test void managerDecisionIsScopedAndSavesUtcDecisionTime() throws Exception {
        UUID requestId = insertRequest(employeeId);
        mvc.perform(get("/api/leave-requests/" + requestId).with(authentication(auth(managerId,"MANAGER"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.employeeName").value("alex@example.test"));
        mvc.perform(get("/api/leave-requests/" + requestId).with(authentication(auth(otherManagerId,"MANAGER"))))
            .andExpect(status().isNotFound());
        mvc.perform(post("/api/leave-requests/" + requestId + "/decision").with(authentication(auth(employeeId,"EMPLOYEE"))).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"APPROVED\"}"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.id").doesNotExist()).andExpect(jsonPath("$.reason").doesNotExist());
        String approvedBody = mvc.perform(post("/api/leave-requests/" + requestId + "/decision").with(authentication(auth(managerId,"MANAGER"))).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"APPROVED\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.decidedAt").exists()).andReturn().getResponse().getContentAsString();
        mvc.perform(post("/api/leave-requests/" + requestId + "/decision").with(authentication(auth(managerId,"MANAGER"))).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"REJECTED\"}"))
            .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals("APPROVED", jdbc.queryForObject("SELECT status FROM leave_request WHERE id = ?", String.class, requestId));
        var decidedAt = jdbc.queryForObject("SELECT decided_at FROM leave_request WHERE id = ?", java.time.OffsetDateTime.class, requestId);
        org.junit.jupiter.api.Assertions.assertEquals(java.time.ZoneOffset.UTC, decidedAt.getOffset());
        var returnedDecisionTime = java.time.OffsetDateTime.parse(objectMapper.readTree(approvedBody).get("decidedAt").asText());
        org.junit.jupiter.api.Assertions.assertEquals(java.time.ZoneOffset.UTC, returnedDecisionTime.getOffset());
        org.junit.jupiter.api.Assertions.assertEquals(decidedAt.toInstant(), returnedDecisionTime.toInstant());

        UUID rejectedRequestId = insertRequest(employeeId);
        String rejectedBody = mvc.perform(post("/api/leave-requests/" + rejectedRequestId + "/decision").with(authentication(auth(managerId,"MANAGER"))).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"REJECTED\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"))
            .andReturn().getResponse().getContentAsString();
        var rejectedPersistedAt = jdbc.queryForObject("SELECT decided_at FROM leave_request WHERE id = ?", java.time.OffsetDateTime.class, rejectedRequestId);
        var rejectedReturnedAt = java.time.OffsetDateTime.parse(objectMapper.readTree(rejectedBody).get("decidedAt").asText());
        org.junit.jupiter.api.Assertions.assertEquals("REJECTED", jdbc.queryForObject("SELECT status FROM leave_request WHERE id = ?", String.class, rejectedRequestId));
        org.junit.jupiter.api.Assertions.assertEquals(java.time.ZoneOffset.UTC, rejectedReturnedAt.getOffset());
        org.junit.jupiter.api.Assertions.assertEquals(rejectedPersistedAt.toInstant(), rejectedReturnedAt.toInstant());
    }

    @Test void concurrentOppositeDecisionsHaveExactlyOneWinner() throws Exception {
        UUID requestId = insertRequest(employeeId);
        var ready = new CountDownLatch(2); var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var approve = pool.submit(() -> raceDecision(requestId, "APPROVED", ready, start));
            var reject = pool.submit(() -> raceDecision(requestId, "REJECTED", ready, start));
            org.junit.jupiter.api.Assertions.assertTrue(ready.await(5, TimeUnit.SECONDS)); start.countDown();
            var outcomes = java.util.List.of(approve.get(10, TimeUnit.SECONDS), reject.get(10, TimeUnit.SECONDS));
            org.junit.jupiter.api.Assertions.assertEquals(1, outcomes.stream().filter(outcome -> outcome.httpStatus() == 200).count());
            org.junit.jupiter.api.Assertions.assertEquals(1, outcomes.stream().filter(outcome -> outcome.httpStatus() == 409).count());
            String persistedStatus = jdbc.queryForObject("SELECT status FROM leave_request WHERE id = ?", String.class, requestId);
            var persistedAt = jdbc.queryForObject("SELECT decided_at FROM leave_request WHERE id = ?", java.time.OffsetDateTime.class, requestId);
            var winner = outcomes.stream().filter(outcome -> outcome.httpStatus() == 200).findFirst().orElseThrow();
            org.junit.jupiter.api.Assertions.assertEquals(winner.decision(), persistedStatus);
            org.junit.jupiter.api.Assertions.assertNotNull(persistedAt);
            org.junit.jupiter.api.Assertions.assertEquals(java.time.ZoneOffset.UTC, winner.decidedAt().getOffset());
            org.junit.jupiter.api.Assertions.assertEquals(winner.decidedAt().toInstant(), persistedAt.toInstant());
        }
    }

    private DecisionOutcome raceDecision(UUID requestId, String decision, CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown(); start.await();
        try {
            LeaveRequest saved = service.decide(requestId, managerId, decision);
            return new DecisionOutcome(200, saved.status(), saved.decidedAt());
        } catch (demo.leave.request.controller.LeaveApiException ex) {
            return new DecisionOutcome(ex.status(), null, null);
        }
    }
    private record DecisionOutcome(int httpStatus, String decision, java.time.OffsetDateTime decidedAt) { }
    private UUID insertRequest(UUID owner) {
        return jdbc.queryForObject("INSERT INTO leave_request(employee_id,start_date,end_date,reason) VALUES (?, ?, ?, ?) RETURNING id",
            UUID.class, owner, LocalDate.now().plusDays(3), LocalDate.now().plusDays(3), "Test leave");
    }

    private UUID addUser(String role, String email) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO app_user(id, display_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)", id, email, email, "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy", role);
        return id;
    }
    private UsernamePasswordAuthenticationToken auth(UUID id, String role) {
        AppUserPrincipal principal = new AppUserPrincipal(new AppUser(id, "demo@example.test", "Demo", "unused", role));
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
    }
}
