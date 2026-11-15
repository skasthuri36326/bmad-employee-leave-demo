package demo.leave.user.repository;

import demo.leave.user.model.AppUser;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<AppUser> findByEmail(String email) {
        List<AppUser> users = jdbcTemplate.query(
            "SELECT id, email, display_name, password_hash, role FROM app_user WHERE lower(email) = lower(?)",
            (result, row) -> new AppUser(
                result.getObject("id", java.util.UUID.class),
                result.getString("email"),
                result.getString("display_name"),
                result.getString("password_hash"),
                result.getString("role")),
            email);
        if (users.size() > 1) {
            return Optional.empty();
        }
        return users.stream().findFirst();
    }
}
