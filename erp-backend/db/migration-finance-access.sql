-- Finance access permission for permission-first RBAC

INSERT OR IGNORE INTO permissions (id, code, description)
VALUES ('perm-finance-access', 'finance.access', 'Access the finance workspace');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'finance.access'
WHERE r.name IN ('Super Admin', 'Principal', 'HOD', 'Accountant', 'Student', 'Parent');