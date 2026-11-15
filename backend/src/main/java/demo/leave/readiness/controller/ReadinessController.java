package demo.leave.readiness.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReadinessController {
    private final JdbcTemplate jdbcTemplate;

    public ReadinessController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/internal/ready")
    public ResponseEntity<Void> ready() {
        jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        return ResponseEntity.noContent().build();
    }
}
