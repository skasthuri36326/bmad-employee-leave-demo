package demo.leave.readiness.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

class ReadinessControllerTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ReadinessController controller = new ReadinessController(jdbc);

    @Test
    void returnsNoContentOnlyAfterDatabaseProbeSucceeds() {
        when(jdbc.queryForObject("SELECT 1", Integer.class)).thenReturn(1);

        var response = controller.ready();

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(jdbc).queryForObject("SELECT 1", Integer.class);
    }

    @Test
    void propagatesDatabaseFailureInsteadOfReportingReady() {
        when(jdbc.queryForObject("SELECT 1", Integer.class))
            .thenThrow(new DataAccessResourceFailureException("database unavailable"));

        assertThrows(DataAccessResourceFailureException.class, controller::ready);
    }
}
