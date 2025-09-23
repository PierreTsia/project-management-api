# PR-003 — Context Service Skeleton

## References
- Operational MVP Spec: `docs/dev-plans/operational-mcp-integration-spec.md` [spec:OPS-MVP]
- Phase 0/1 code: `src/ai/*`, existing domain modules under `src/projects`, `src/tasks`, `src/users`, `src/teams` (read-only usage) [spec:OPS-MVP]

## Summary & Scope
- Objective: Provide a single, read-only `ContextService` that aggregates minimal, consistent inputs for MCP tools and AI endpoints.
- In-scope:
  - `ContextService` with methods: `getProject`, `getTasks`, `getTeam`, `getRecentHistory` [spec:OPS-MVP]
  - Contracts: stable DTO-like internal types returned by the service
  - Repository adapters/stubs to source data from existing modules (no mutating ops)
  - Unit tests for happy/empty paths
- Out of scope:
  - Writes/mutations, vector search, cross-project joins, advanced filtering

## Assumptions & Constraints
- Read-only, synchronous composition; graceful degradation on partial loads with `degraded: true` annotation when applicable [spec:OPS-MVP]
- Hard caps: return at most 200 tasks per project for MVP; deterministic sort applied
- History is best-effort and non-blocking; default window is last 20 events (configurable)
- Stable internal shapes; tools depend on these shapes for prompt construction

## Decisions (Locked for MVP)
- Max tasks cap: 200 per project response (excess tasks are not included)
- Team fields: minimal available from current user profiles only (e.g., id, name/display handle); roles/availability omitted if not present
- History: treat as unreliable; include if available, otherwise return empty array and set `degraded: true`; do not fail requests

## Context Schema (Draft)

```ts
// Shared unions aligned with current UI/API
export type ContextTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type ContextTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ContextTaskLinkType =
  | 'BLOCKS'
  | 'IS_BLOCKED_BY'
  | 'SPLITS_TO'
  | 'SPLITS_FROM'
  | 'RELATES_TO'
  | 'DUPLICATES'
  | 'IS_DUPLICATED_BY';

export interface ProjectContext {
  id: string;
  name: string;
}

export interface TeamMemberContext {
  id: string;
  displayName: string; // minimal: derived from existing user profile fields
}

export interface TaskLinkContext {
  id: string;
  projectId: string;
  sourceTaskId: string;
  targetTaskId: string;
  type: ContextTaskLinkType;
  createdAt: string; // ISO
}

export interface TaskHierarchyEdgeContext {
  id: string;
  projectId: string;
  parentTaskId: string;
  childTaskId: string;
  createdAt: string; // ISO
}

export interface TaskContext {
  id: string;
  title: string;
  description?: string;
  status: ContextTaskStatus;
  priority: ContextTaskPriority;
  dueDate?: string; // ISO
  projectId: string;
  projectName: string;
  assigneeId?: string;
  assigneeDisplayName?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  links?: ReadonlyArray<TaskLinkContext>;
  parents?: ReadonlyArray<TaskHierarchyEdgeContext>;
  children?: ReadonlyArray<TaskHierarchyEdgeContext>;
}

export interface HistoryEventContext {
  id: string;
  type: 'STATUS_CHANGE' | 'COMMENT' | 'ATTACHMENT' | 'ASSIGNMENT' | 'OTHER';
  timestamp: string; // ISO
  actorId?: string;
  summary?: string; // short, redacted-friendly
}

export interface AggregatedContextMeta {
  degraded: boolean;
  tasksTruncated: boolean;
  tasksReturned: number;
  historyWindow: number; // e.g., 20
}

export interface ProjectAggregatedContext {
  project: ProjectContext;
  tasks: ReadonlyArray<TaskContext>; // capped at 200
  team: ReadonlyArray<TeamMemberContext>;
  history: ReadonlyArray<HistoryEventContext>; // best-effort
  meta: AggregatedContextMeta;
}
```

Constraints:
- Tasks array is strictly capped at 200, sorted deterministically (e.g., priority DESC, updatedAt DESC, title ASC)
- History defaults to last 20 events if available; absence yields empty array and `meta.degraded = true`
- Team members include only `id` and `displayName` for MVP

## Incremental Plan

### 1) Define Contracts (Internal Types)
- [ ] Draft TypeScript interfaces for `ProjectContext`, `TaskContext`, `TeamMemberContext`, `HistoryEventContext`, and `AggregatedContextMeta` (with `degraded` flag) [spec:OPS-MVP]
- [ ] Add narrow string unions for known enums (status, priority, role) aligned with existing domain

### 2) Service Skeleton
- [ ] Create `ContextService` with public methods:
  - `getProject(projectId: string)` → core project fields
  - `getTasks(projectId: string)` → array of tasks with status, effort, dependencies (capped at 200)
  - `getTeam(projectId: string)` → minimal user profile fields available
  - `getRecentHistory(projectId: string)` → last N events (default 20, best-effort) [spec:OPS-MVP]
- [ ] Provide method-level timeouts and early returns for empty states

### 3) Repository Adapters (Read-Only)
- [ ] Introduce thin adapters or facades over existing repositories/services (projects, tasks, users/teams, activity/history)
- [ ] Normalize to the internal types; avoid leaking rich domain entities into the context layer

### 4) Validation & Guards
- [ ] Input validation for `projectId` shape; short-circuit if not found
- [ ] Output validation via minimal runtime checks or zod to ensure stable shapes before returning to tools
- [ ] Enforce pagination/limits (tasks ≤ 200, history ≤ 20 by default) and sorting for deterministic outputs

### 5) Observability
- [ ] Add tracing span `context.load` with tags: `projectId`, `collectionsLoaded`, `latencyMs`, `degraded`
- [ ] Lightweight metrics: `ai.context.request` and `ai.context.latency` (ms)

### 6) Tests
- [ ] Unit tests for each method (happy path + empty/no-project path)
- [ ] Tests for limit enforcement and `degraded` annotation when a sub-load fails

### 7) Wiring & Docs
- [ ] Register `ContextService` in `AiModule` providers and export as needed
- [ ] Developer notes documenting shapes, limits, and typical usage by tools

## API/Types Impact
- [ ] No public REST DTO changes; internal contracts only
- [ ] Tools (`ProjectHealthTool`, `TaskGeneratorTool`) consume `ContextService` outputs without domain coupling

## Acceptance Criteria
- [ ] All four methods return stable, validated shapes; empty states handled deterministically
- [ ] `degraded: true` set when any sub-source fails while others succeed
- [ ] `getTasks` enforces a strict cap of 200 tasks
- [ ] `getTeam` returns only minimal fields available from current profiles
- [ ] `getRecentHistory` is best-effort; absence does not fail acceptance (empty array allowed)
- [ ] Unit tests cover happy and empty paths; limits are enforced
- [ ] Basic tracing/metrics present for `context.load`

## Definition of Done
- [ ] Internal types defined and exported from `src/ai/context/models`
- [ ] `ContextService` implemented under `src/ai/context/context.service.ts` with adapters
- [ ] Tests added under `src/ai/context/*.spec.ts` and passing
- [ ] Documentation updated in `docs/dev-plans` referencing shapes and limits (tasks cap 200; history best-effort, default 20)

## Changelog
- 2025-09-23: Initial PR-003 battle plan drafted per OPS-MVP.


