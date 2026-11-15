CREATE TABLE leave_request (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL,
    employee_role varchar(16) NOT NULL DEFAULT 'EMPLOYEE' CHECK (employee_role = 'EMPLOYEE'),
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason varchar(500) NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),
    status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    decided_at timestamptz,
    CONSTRAINT ck_leave_dates CHECK (end_date >= start_date),
    CONSTRAINT ck_leave_decision_time CHECK ((status = 'PENDING' AND decided_at IS NULL) OR (status IN ('APPROVED', 'REJECTED') AND decided_at IS NOT NULL)),
    CONSTRAINT fk_leave_employee_role FOREIGN KEY (employee_id, employee_role) REFERENCES app_user (id, role)
);

CREATE INDEX ix_leave_request_employee_created ON leave_request (employee_id, created_at DESC);
