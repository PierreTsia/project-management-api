Linked Task Generation (No changes to flat generator)

References
- Spec: AI-Generated Tasks with Relationships & Hierarchy Architecture — [spec:api/docs/dev-plans/ai-linked-hierarchical-tasks-architecture.md]

Summary & Scope
- Objective: Add an option to generate tasks with links using the existing links schema and validation chains, without altering the current flat task generation feature or its API.
- In scope: New preview/confirm flow for linked tasks; backend tools/services/endpoints; UI option and modal preview; metrics, auth, and validation reuse.
- Out of scope: Any change to the existing flat generator behavior, prompt format, or endpoint; non-link hierarchies (unless explicitly flagged later); large-scale UI redesign.

Assumptions & Constraints
- The links schema and `TaskRelationshipValidationChain` already exist and are production-ready for reuse. [spec:Architecture#Validation]
- AI toolchain is LangChain v1.5 with structured outputs; `AI_TOOLS_ENABLED` gate remains. [spec:Architecture#LangChain]
- IDs are UUID; preview uses placeholder refs like `task_1`. [spec:Two-Step-Confirmation-Flow]
- Performance target P95 ≤ 1.5s for preview, ≤ 1.5s for confirm on 20 tasks with ≤ 20 links.

Decisions (Resolved)
- Allowed link types: use all existing link types (BLOCKS, IS_BLOCKED_BY, DUPLICATES, IS_DUPLICATED_BY, SPLITS_TO, SPLITS_FROM, RELATES_TO). We will clearly label hierarchy as a separate concept to avoid confusion with upcoming hierarchy features. [spec:TaskRelationshipGeneratorTool]
- Cross-project links: not allowed in this flow; restrict to same project only.
- Rate limits: out of scope for v1; revisit in v2.
- Preview editing: allow simple remove/edit of links before confirm; keep UI minimal for POC speed.
- Metrics naming: adopt `ai.linked.preview.*` and `ai.linked.confirm.*` namespaces with tags `provider`, `model`, `link_type`.

Incremental Plan

Phase 0 — Foundations
- [x] Create DTOs for preview/confirm/response with placeholders vs real IDs. [spec:New DTOs & Schemas]
- [x] Register new providers in `AiModule` without touching existing flat generator. [spec:Updated AI Module]
- [x] Add OpenAPI schemas for new DTOs and endpoints. [spec:New Controller Endpoints]

Phase 1 — Backend: Relationship Preview/Confirm
- [ ] Implement `TaskRelationshipGeneratorTool.generatePreview` producing tasks + placeholder links. (depends on: DTOs) [spec:TaskRelationshipGeneratorTool]
- [ ] Implement `TaskRelationshipGeneratorTool.confirmAndCreate` to create tasks, resolve placeholders, validate, persist links. [spec:TaskRelationshipGeneratorTool]
- [ ] Wire `AiService` methods: `generateLinkedTasksPreview`, `confirmLinkedTasks` with AI gate. [spec:Enhanced AI Service]
- [ ] Expose endpoints: `POST /ai/generate-linked-tasks-preview`, `POST /ai/confirm-linked-tasks` with metrics, auth. [spec:New Controller Endpoints]
- [ ] Add unit tests for placeholder resolution and validation pass/fail cases.
 - [ ] Confirm behavior: do not rollback tasks; attempt all links; skip invalid links; return counts and created/rejected arrays with reasons; HTTP 200 with multi-status semantics in body.

Phase 2 — Frontend: Modal Option & Preview
- [ ] Add generation mode option `linked` to task generation modal; keep `flat` default unchanged. [spec:Frontend Integration]
- [ ] Implement preview UI: list of tasks + relationship diagram; allow cancel/back. [spec:Two-Step Confirmation Flow]
- [ ] Provide minimal edit/remove for generated links in preview (inline delete, type dropdown). (depends on: preview UI)
- [ ] Call preview endpoint, then confirm endpoint; show success state and render created links.
- [ ] Feature flag `ai_linked_tasks` to gate UI entry points.

Phase 3 — Observability & Guardrails
- [ ] Add metrics: request/latency/error for both endpoints using `ai.linked.preview.request|latency|error` and `ai.linked.confirm.request|latency|error`; add counters by `link_type`.
- [ ] Add audit trail entries for auto-created links (who/when/prompt hash).
- [ ] Add size limits (max tasks/links) with friendly errors. (rate limits deferred to v2)

Phase 4 — Hardening & Docs
- [ ] e2e tests: happy path, invalid relationship rejected, circular dependency skipped, partial creation behavior.
- [ ] Performance pass: batch inserts, minimize N+1 during validation.
- [ ] Update docs and in-app help for linked generation flow.

API/Schema & Types Impact
- [ ] New DTOs: `GenerateLinkedTasksPreviewDto`, `TaskRelationshipPreviewDto`, `ConfirmLinkedTasksDto`, `GenerateLinkedTasksResponseDto`, `TaskRelationshipDto`. [spec:New DTOs & Schemas]
- [ ] No changes to existing flat `GenerateTasksRequestDto`/endpoint.
- [ ] Typescript strict DTOs (no `any`), discriminated by placeholder vs real IDs following workspace TS rules.

UX Acceptance Criteria & Test Plan
- [ ] Given `ai_linked_tasks` flag ON, when user selects "Tasks with Relationships" and submits a prompt, then a preview with tasks and placeholder links displays. [spec:Two-Step Confirmation Flow]
- [ ] When user confirms, tasks are created first, links created after validation; success UI shows created links with real IDs.
- [ ] If a generated link fails validation, it is skipped with a visible note; other valid links still created; no task rollback.
- [ ] The API response includes counts (totalLinks, createdLinks, rejectedLinks) and arrays (createdRelationships[], rejectedRelationships[] with reasons) so the UI can surface warnings and allow resubmission of failed links.
- [ ] Existing "Flat Tasks" flow remains unchanged when selected; no new fields required.
- [ ] a11y: modal is keyboard navigable; relationship diagram has text fallback.
- Tests: unit (placeholder resolution, validation outcomes), integration (service + validation chain), e2e (endpoints + DB), FE component tests (mode switch, preview, confirm).

Risks & Mitigations
- **Over-linking noise**: Constrain link count and types; tune prompts; add cap per task.
- **Circular/invalid links**: Use `TaskRelationshipValidationChain` and skip invalids with telemetry. [spec:Validation Strategy]
- **User confusion**: Clear preview copy; edit/remove controls in preview if approved by PM.
- **Perf regressions**: Batch create; prefetch required entities; measure and cap payload.

Rollout & Feature Flags
- Flag: `ai_linked_tasks` (UI only). Backend relies on existing `AI_TOOLS_ENABLED` env gate (not a feature flag). Assume `ai_linked_tasks` ON for this effort; gradual prod rollout still possible.
- Metrics: adoption, preview→confirm conversion, error rates by link type.
- Rollback: disable flag; no schema migrations required.
 - Cross-project enforcement: validate and reject any cross-project link attempts in confirm phase.

Definition of Done
- [ ] New endpoints live with OpenAPI docs and auth/metrics.
- [ ] UI toggle available; flat generator unchanged and unaffected.
- [ ] Tests passing: unit/integration/e2e/FE; coverage meets repo threshold.
- [ ] Runbook and docs updated.

Changelog
- 2025-09-25: Initial draft based on architecture doc.


