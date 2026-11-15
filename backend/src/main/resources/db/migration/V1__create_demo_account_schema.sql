CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_user (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name text NOT NULL,
    email text NOT NULL UNIQUE,
    password_hash varchar(60) NOT NULL
        CHECK (password_hash ~ '^\$2a\$10\$[./A-Za-z0-9]{53}$'),
    role varchar(16) NOT NULL
        CHECK (role IN ('EMPLOYEE', 'MANAGER')),
    CONSTRAINT uq_app_user_id_role UNIQUE (id, role)
);

CREATE TABLE employee_manager_assignment (
    employee_id uuid PRIMARY KEY,
    employee_role varchar(16) NOT NULL DEFAULT 'EMPLOYEE'
        CHECK (employee_role = 'EMPLOYEE'),
    manager_id uuid NOT NULL,
    manager_role varchar(16) NOT NULL DEFAULT 'MANAGER'
        CHECK (manager_role = 'MANAGER'),
    CONSTRAINT fk_assignment_employee_role
        FOREIGN KEY (employee_id, employee_role) REFERENCES app_user (id, role),
    CONSTRAINT fk_assignment_manager_role
        FOREIGN KEY (manager_id, manager_role) REFERENCES app_user (id, role)
);
