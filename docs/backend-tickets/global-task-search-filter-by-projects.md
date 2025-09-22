Global Task Search — Filter by Projects (BE-Global-Search-Projects)

References
- Global Tasks API Implementation Plan — `docs/global-tasks-api-implementation-plan.md`
- Current code: `src/tasks/controllers/global-tasks.controller.ts`, `src/tasks/dto/global-search-tasks.dto.ts`, `src/tasks/tasks.service.ts`

Summary & Scope
- Add ability to filter global task search results by ALL accessible projects or by a provided list of project IDs.
- In-scope: request DTO, controller Swagger docs, query-building, permission validation, tests.
- Out-of-scope: new indexes, new endpoints, DB migrations (none required), UI changes.

Assumptions & Constraints
- Default behavior today returns tasks across all accessible projects when no project filter is provided. We will preserve this default.
- Input size: up to 50 project IDs in one request (server-side max to avoid pathological IN clauses).
- Backward compatibility: not required; the legacy `projectId` filter will be removed.

Open Questions (Resolved)
- [x] No explicit `allProjects` flag. Absence of `projectIds` means ALL accessible projects. Owner: PM/BE
- [x] Remove legacy `projectId` entirely. If provided, respond 400 with guidance to use `projectIds`. Owner: BE

Incremental Plan
- Phase 0 — Foundations
  - [ ] Add ADR note in this doc’s changelog about introducing `projectIds` [spec:GlobalTasks]
- Phase 1 — API and DTO
  - [x] Update `GlobalSearchTasksDto` to add `projectIds?: string[]` with validation (UUID array, max length 50)
  - [x] Remove `projectId` from DTO and from generated OpenAPI
- Phase 2 — Controller & Service
  - [x] Extend Swagger `@ApiQuery` in `GlobalTasksController.search` to document `projectIds` (array) and remove `projectId`
  - [x] In `TasksService.applyGlobalSearchFilters`, support `IN (:...projectIds)` when array present
  - [x] Add access validation: ensure all requested `projectIds` are within user’s accessible projects; otherwise 403
  - [x] If request includes `projectId`, return 400 with message: "Use projectIds[] query param"
- Phase 3 — Tests
  - [ ] Unit: DTO validates arrays (UUID, max, empty → treat as ALL)
  - [x] Unit: Service builds correct `IN` clause and respects other filters
  - [x] Unit: Permission check rejects non-accessible project IDs
  - [ ] Integration: `/tasks` and `/tasks/search` honor `projectIds` and pagination
  - [ ] Integration: Sending `projectId` returns 400 with guidance

API/Schema & Types Impact
- Request (enhanced):
  - `GET /tasks` and `GET /tasks/search`
  - Query params: `projectIds?: string[]` (array of UUIDs). Absence means ALL accessible projects.
- Validation:
  - `projectIds`: optional, array of UUID v4, `@MaxLength(50)` on array length; if provided empty, treat as ALL (ignore filter)
- Query logic:
  - If no `projectIds` provided → no project filter (ALL accessible)
  - If `projectIds` provided → `task.projectId IN (:...projectIds)`
- Permissions:
  - Compute `accessibleProjectIds` for user; if any requested ID not in that set → 403

UX Acceptance Criteria & Test Plan
- Given I search globally with `projectIds=[P1,P2]`, When results load, Then only tasks for P1 or P2 are returned, with other filters still applying.
- Given I search with no project filter, Then tasks from all accessible projects are returned.
- Given I include a project I cannot access, Then I receive 403.
- Given I send legacy `projectId=P1`, Then I receive 400 with error: "Use projectIds[] query param".

Risks & Mitigations
- Large `IN` lists impacting query planner — limit to 50 IDs and consider splitting if needed.
- Confusion between `projectId` and `projectIds` — deprecate in docs, add lint to remove later.

Rollout & Feature Flags
- No runtime flag needed. Breaking change for query shape is minor and documented; UI not using `projectId`.

Definition of Done
- [x] DTO and Swagger updated; `projectIds` documented and validated; `projectId` removed
- [x] Service applies `IN` correctly and enforces permissions
- [x] Errors: `projectId` usage returns 400 with guidance
- [x] Tests: unit + integration updated and passing
- [x] OpenAPI regenerated and reviewed

Changelog
- 2025-09-22: Decision — no `allProjects` flag; remove `projectId`; add `projectIds`.


