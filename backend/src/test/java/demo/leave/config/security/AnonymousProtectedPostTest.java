package demo.leave.config.security;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:leave_test;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.flyway.enabled=false"
})
class AnonymousProtectedPostTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void anonymousCreateRequestWithoutCsrfHeaderReturnsUnauthorized() throws Exception {
        String futureDate = LocalDate.now(ZoneId.of("Europe/London")).plusDays(1).toString();
        mockMvc.perform(post("/api/leave-requests")
                .contentType("application/json")
                .content("{\"startDate\":\"" + futureDate + "\",\"endDate\":\"" + futureDate + "\",\"reason\":\"anonymous check\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
            .andExpect(jsonPath("$.type").value("about:blank"))
            .andExpect(jsonPath("$.title").value("Unauthorized"))
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.id").doesNotExist())
            .andExpect(jsonPath("$.employeeId").doesNotExist())
            .andExpect(jsonPath("$.employeeName").doesNotExist())
            .andExpect(jsonPath("$.startDate").doesNotExist())
            .andExpect(jsonPath("$.endDate").doesNotExist())
            .andExpect(jsonPath("$.createdAt").doesNotExist())
            .andExpect(jsonPath("$.decidedAt").doesNotExist())
            .andExpect(jsonPath("$.reason").doesNotExist())
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("anonymous check"))));
    }
}
