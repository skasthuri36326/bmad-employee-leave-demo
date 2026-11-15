package demo.leave.config.security;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;

import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:auth_test;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.flyway.enabled=false"
})
class SecurityAuthenticationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void seedTestAccounts() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS app_user");
        jdbcTemplate.execute("CREATE TABLE app_user (id UUID PRIMARY KEY, display_name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(60) NOT NULL, role VARCHAR(16) NOT NULL)");
        String hash = new BCryptPasswordEncoder(10).encode("test-password");
        jdbcTemplate.update("INSERT INTO app_user (id, display_name, email, password_hash, role) VALUES (RANDOM_UUID(), ?, ?, ?, ?)",
            "Demo Employee", "employee@example.test", hash, "EMPLOYEE");
        jdbcTemplate.update("INSERT INTO app_user (id, display_name, email, password_hash, role) VALUES (RANDOM_UUID(), ?, ?, ?, ?)",
            "Demo Manager", "manager@example.test", hash, "MANAGER");
    }

    @Test
    void bootstrapsCsrfAuthenticatesServerRoleAndRotatesSession() throws Exception {
        MvcResult bootstrap = mockMvc.perform(get("/api/auth/csrf"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                .string("Cache-Control", "no-store"))
            .andReturn();
        MockHttpSession preLogin = (MockHttpSession) bootstrap.getRequest().getSession(false);
        assertTrue(preLogin != null, "CSRF bootstrap should establish a pre-login session");
        String preLoginId = preLogin.getId();
        String csrf = csrfToken(bootstrap);

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                .session(preLogin)
                .header("X-CSRF-TOKEN", csrf)
                .contentType("application/json")
                .content("{\"email\":\"manager@example.test\",\"password\":\"test-password\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("MANAGER"))
            .andExpect(jsonPath("$.email").value("manager@example.test"))
            .andReturn();
        MockHttpSession authenticated = (MockHttpSession) login.getRequest().getSession(false);
        assertTrue(authenticated != null);
        assertNotEquals(preLoginId, authenticated.getId(), "Login must rotate the session ID");

        mockMvc.perform(get("/api/me").session(authenticated))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("MANAGER"));
    }

    @Test
    void anonymousProtectedPostIsUnauthorizedBeforeCsrfAndValidSessionWithBadCsrfIsForbidden() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/logout").header("X-CSRF-TOKEN", "invalid"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/me"))
            .andExpect(status().isUnauthorized());

        MvcResult bootstrap = mockMvc.perform(get("/api/auth/csrf")).andReturn();
        MockHttpSession session = (MockHttpSession) bootstrap.getRequest().getSession(false);
        String csrf = csrfToken(bootstrap);
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                .session(session)
                .header("X-CSRF-TOKEN", csrf)
                .contentType("application/json")
                .content("{\"email\":\"employee@example.test\",\"password\":\"test-password\"}"))
            .andExpect(status().isOk())
            .andReturn();
        MockHttpSession authenticated = (MockHttpSession) login.getRequest().getSession(false);
        mockMvc.perform(post("/api/auth/logout").session(authenticated))
            .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/auth/logout")
                .session(authenticated)
                .header("X-CSRF-TOKEN", "invalid"))
            .andExpect(status().isForbidden());
    }

    @Test
    void invalidCredentialsReturnGenericProblemDetails() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content("{\"email\":\"employee@example.test\",\"password\":\"test-password\"}"))
            .andExpect(status().isForbidden());

        MvcResult bootstrap = mockMvc.perform(get("/api/auth/csrf")).andReturn();
        MockHttpSession session = (MockHttpSession) bootstrap.getRequest().getSession(false);

        mockMvc.perform(post("/api/auth/login")
                .session(session)
                .header("X-CSRF-TOKEN", csrfToken(bootstrap))
                .contentType("application/json")
                .content("null"))
            .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/login")
                .session(session)
                .header("X-CSRF-TOKEN", csrfToken(bootstrap))
                .contentType("application/json")
                .content("{\"email\":\"employee@example.test\",\"password\":\"incorrect-password\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                .contentTypeCompatibleWith("application/problem+json"))
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.detail").doesNotExist())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                .string("Cache-Control", "no-store"));
    }

    @Test
    void caseVariantDuplicateEmailIsRejectedInsteadOfSelectingAnArbitraryAccount() throws Exception {
        String hash = new BCryptPasswordEncoder(10).encode("test-password");
        jdbcTemplate.update("INSERT INTO app_user (id, display_name, email, password_hash, role) VALUES (RANDOM_UUID(), ?, ?, ?, ?)",
            "Case Variant Employee", "MANAGER@EXAMPLE.TEST", hash, "EMPLOYEE");
        MvcResult bootstrap = mockMvc.perform(get("/api/auth/csrf")).andReturn();

        mockMvc.perform(post("/api/auth/login")
                .session((MockHttpSession) bootstrap.getRequest().getSession(false))
                .header("X-CSRF-TOKEN", csrfToken(bootstrap))
                .contentType("application/json")
                .content("{\"email\":\"manager@example.test\",\"password\":\"test-password\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutInvalidatesTheAuthenticatedSessionAndMeRequiresAuthentication() throws Exception {
        MvcResult bootstrap = mockMvc.perform(get("/api/auth/csrf")).andReturn();
        MockHttpSession session = (MockHttpSession) bootstrap.getRequest().getSession(false);
        String csrf = csrfToken(bootstrap);
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                .session(session)
                .header("X-CSRF-TOKEN", csrf)
                .contentType("application/json")
                .content("{\"email\":\"employee@example.test\",\"password\":\"test-password\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("EMPLOYEE"))
            .andReturn();
        MockHttpSession authenticated = (MockHttpSession) login.getRequest().getSession(false);
        mockMvc.perform(post("/api/auth/logout")
                .session(authenticated)
                .header("X-CSRF-TOKEN", csrf))
            .andExpect(status().isForbidden());
        MvcResult refreshed = mockMvc.perform(get("/api/auth/csrf").session(authenticated)).andReturn();
        String postLoginCsrf = csrfToken(refreshed);
        assertNotEquals(csrf, postLoginCsrf, "Login must clear and refresh the CSRF token");

        mockMvc.perform(post("/api/auth/logout")
                .session(authenticated)
                .header("X-CSRF-TOKEN", postLoginCsrf))
            .andExpect(status().isNoContent())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                .string("Set-Cookie", allOf(containsString("LEAVESESSION="), containsString("HttpOnly"),
                    containsString("SameSite=Lax"), containsString("Max-Age=0"), not(containsString("Secure")))));
        mockMvc.perform(get("/api/me").session(authenticated))
            .andExpect(status().isUnauthorized());
    }

    private String csrfToken(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        Matcher matcher = Pattern.compile("\\\"token\\\":\\\"([^\\\"]+)\\\"").matcher(body);
        assertTrue(matcher.find(), "CSRF response should include a token");
        return matcher.group(1);
    }
}
