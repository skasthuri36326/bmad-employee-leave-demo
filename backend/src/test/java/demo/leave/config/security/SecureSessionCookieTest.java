package demo.leave.config.security;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:secure_cookie_test;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.flyway.enabled=false",
    "server.servlet.session.cookie.secure=true"
})
class SecureSessionCookieTest {
    @Value("${local.server.port}") private int port;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private PasswordEncoder passwordEncoder;
    private final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void seedAccount() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS app_user");
        jdbcTemplate.execute("CREATE TABLE app_user (id UUID PRIMARY KEY, display_name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(60) NOT NULL, role VARCHAR(16) NOT NULL)");
        jdbcTemplate.update("INSERT INTO app_user (id, display_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
            UUID.randomUUID(), "Cookie Test Employee", "cookie-employee@example.test", passwordEncoder.encode("test-password"), "EMPLOYEE");
    }

    @Test
    void configuredHttpsSessionAndLogoutCookiesBothCarrySecure() throws Exception {
        HttpResponse<String> bootstrap = get("/api/auth/csrf", null);
        assertTrue(bootstrap.statusCode() >= 200 && bootstrap.statusCode() < 300);
        String preLoginCookie = cookiePair(bootstrap);
        assertSecureSessionCookie(setCookie(bootstrap));
        String preLoginToken = token(bootstrap.body());

        HttpResponse<String> login = post("/api/auth/login", preLoginCookie, preLoginToken,
            "{\"email\":\"cookie-employee@example.test\",\"password\":\"test-password\"}");
        assertTrue(login.statusCode() >= 200 && login.statusCode() < 300);
        String authenticatedCookie = cookiePair(login);
        assertNotEquals(preLoginCookie, authenticatedCookie);
        assertSecureSessionCookie(setCookie(login));

        HttpResponse<String> postLoginCsrf = get("/api/auth/csrf", authenticatedCookie);
        String logoutToken = token(postLoginCsrf.body());

        HttpResponse<String> logout = post("/api/auth/logout", authenticatedCookie, logoutToken, "");
        assertTrue(logout.statusCode() == 204);
        String clearedCookie = setCookie(logout);
        assertTrue(clearedCookie != null && clearedCookie.contains("Max-Age=0"));
        assertTrue(clearedCookie.contains("Secure"));
        assertTrue(clearedCookie.contains("HttpOnly"));
        assertTrue(clearedCookie.contains("SameSite=Lax"));
    }

    private HttpResponse<String> get(String path, String cookie) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).GET();
        if (cookie != null) request.header("Cookie", cookie);
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String cookie, String csrf, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .header("Content-Type", "application/json");
        if (cookie != null) request.header("Cookie", cookie);
        if (csrf != null) request.header("X-CSRF-TOKEN", csrf);
        return http.send(request.POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    private String cookiePair(HttpResponse<String> response) {
        String header = setCookie(response);
        assertTrue(header != null && header.startsWith("LEAVESESSION="));
        return header.split(";", 2)[0];
    }

    private String setCookie(HttpResponse<String> response) {
        return response.headers().firstValue("Set-Cookie").orElse(null);
    }

    private void assertSecureSessionCookie(String header) {
        assertTrue(header != null && header.startsWith("LEAVESESSION="));
        assertTrue(header.contains("Secure"));
        assertTrue(header.contains("HttpOnly"));
        assertTrue(header.contains("SameSite=Lax"));
    }

    private String token(String body) {
        Matcher matcher = Pattern.compile("\\\"token\\\":\\\"([^\\\"]+)\\\"").matcher(body == null ? "" : body);
        assertTrue(matcher.find());
        return matcher.group(1);
    }
}
