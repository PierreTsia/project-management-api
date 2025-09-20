### Tech Debt Log

- Deploy Preview CI Pipeline Issues
  - Context: The GitHub Actions workflow for deploy previews is currently disabled due to failures. The preview system spins up a fresh database and runs migrations for each PR, which is resource-intensive and has started failing with release command timeouts.
  - Impact: No automated preview deployments for PRs, reducing ability to test changes in a production-like environment before merging.
  - Evidence: 
    - Workflow disabled with `if: false` in `.github/workflows/fly-preview.yml`
    - Previous failures show: "release_command failed running on machine 080553ea157d98 with exit code 1" and "timeout waiting for release command logs"
    - Migration command `pnpm run migrate:prod` times out during deployment
  - Follow-ups (preferred path):
    1. Investigate migration timeout issues - check if migrations are taking too long or hanging
    2. Consider using a shared preview database instead of spinning up fresh DB each time
    3. Add proper error handling and logging to the release command
    4. Implement database seeding strategy for preview environments
    5. Consider using Fly.io's built-in database provisioning instead of manual migration commands
    6. Add health checks and retry logic for the migration step
  - Owners: DevOps + Backend
  - Created: 2025-01-27
