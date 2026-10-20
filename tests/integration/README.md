# Garvix Hosting Manager — Integration, E2E & Recovery Test Suites

- `tests/unit/`: Fast deterministic unit tests for RBAC, multi-tenancy isolation, Ed25519 licensing, GST billing, capacity formulas, and mail preflight checks.
- `tests/security/`: Security regression suite covering path traversal, symlink escape, reserved system identities, command injection, DNS zone injection, license tampering, and transactional rollback.
- `tests/integration/`: Phase 1–3 integration suites against disposable PostgreSQL, MariaDB, Redis, and Mailpit containers (`infrastructure/development/docker-compose.yml`).
- `tests/e2e/`: End-to-end UI & API workflows for Cloud Console and Customer Panel.
- `tests/recovery/`: Automated Restic backup & sandbox restore verification tests and interrupted-provisioning recovery tests.
