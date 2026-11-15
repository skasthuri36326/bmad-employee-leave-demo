package demo.leave.request.repository;

import demo.leave.request.model.LeaveRequest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class LeaveRequestRepository {
    private final JdbcTemplate jdbc;
    private final RowMapper<LeaveRequest> mapper = this::map;

    public LeaveRequestRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public LeaveRequest create(UUID employeeId, java.time.LocalDate start, java.time.LocalDate end, String reason) {
        return jdbc.queryForObject("""
            INSERT INTO leave_request (employee_id, start_date, end_date, reason)
            VALUES (?, ?, ?, ?)
            RETURNING id, employee_id, start_date, end_date, reason, status, created_at, decided_at, NULL::text AS employee_name
            """, mapper, employeeId, start, end, reason);
    }

    public List<LeaveRequest> listEmployee(UUID id) {
        return jdbc.query("""
            SELECT r.id, r.employee_id, r.start_date, r.end_date, r.reason, r.status, r.created_at, r.decided_at, NULL::text AS employee_name
            FROM leave_request r WHERE r.employee_id = ? ORDER BY r.created_at DESC, r.id DESC""", mapper, id);
    }

    public List<LeaveRequest> listManager(UUID id) {
        return jdbc.query("""
            SELECT r.id, r.employee_id, r.start_date, r.end_date, r.reason, r.status, r.created_at, r.decided_at, u.display_name AS employee_name
            FROM leave_request r JOIN employee_manager_assignment a ON a.employee_id = r.employee_id JOIN app_user u ON u.id = r.employee_id
            WHERE a.manager_id = ? ORDER BY r.created_at DESC, r.id DESC""", mapper, id);
    }

    public Optional<LeaveRequest> findEmployee(UUID requestId, UUID employeeId) {
        return jdbc.query("""
            SELECT r.id, r.employee_id, r.start_date, r.end_date, r.reason, r.status, r.created_at, r.decided_at, NULL::text AS employee_name
            FROM leave_request r WHERE r.id = ? AND r.employee_id = ?""", mapper, requestId, employeeId).stream().findFirst();
    }

    public Optional<LeaveRequest> findManager(UUID requestId, UUID managerId) {
        return jdbc.query("""
            SELECT r.id, r.employee_id, r.start_date, r.end_date, r.reason, r.status, r.created_at, r.decided_at, u.display_name AS employee_name
            FROM leave_request r JOIN employee_manager_assignment a ON a.employee_id = r.employee_id JOIN app_user u ON u.id = r.employee_id
            WHERE r.id = ? AND a.manager_id = ?""", mapper, requestId, managerId).stream().findFirst();
    }

    public boolean decide(UUID requestId, UUID managerId, String decision, java.time.OffsetDateTime decidedAt) {
        return jdbc.update("""
            UPDATE leave_request r SET status = ?, decided_at = ?
            WHERE r.id = ? AND r.status = 'PENDING'
              AND EXISTS (SELECT 1 FROM employee_manager_assignment a
                          WHERE a.employee_id = r.employee_id AND a.manager_id = ?)
            """, decision, decidedAt, requestId, managerId) == 1;
    }

    private LeaveRequest map(ResultSet rs, int row) throws SQLException {
        return new LeaveRequest(rs.getObject("id", UUID.class), rs.getObject("employee_id", UUID.class),
            rs.getDate("start_date").toLocalDate(), rs.getDate("end_date").toLocalDate(), rs.getString("reason"),
            rs.getString("status"), rs.getObject("created_at", java.time.OffsetDateTime.class),
            rs.getObject("decided_at", java.time.OffsetDateTime.class), rs.getString("employee_name"));
    }
}
