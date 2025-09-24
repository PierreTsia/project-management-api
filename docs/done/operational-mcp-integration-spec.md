# MCP Integration — Operational MVP Spec

This is the lean, execution-ready spec for the MCP MVP. It trims narrative/diagrams and focuses on contracts, scope, and acceptance criteria. Use this to slice tickets and ship.

## PR Plan (API-first)

The following PRs are intentionally small, independently reviewable, and sequenced for fast feedback. Keep each PR tight and shippable.

1) [x] PR-001: ai-bootstrap-hello-llm
- Goal: Prove the plumbing works end-to-end with a minimal LLM call.
- Scope: Add `AiModule` and `POST /ai/hello` that returns a deterministic hello-world from the configured provider; include basic env config and feature flag.
- Value: Gives a working, testable endpoint to validate infra, auth, and deploy before building real features.

2) [x] PR-002: provider-abstraction-and-config-hardening
- Goal: Make provider choice safe, swappable, and observable.
- Scope: Introduce a single provider interface with pluggable adapters (OpenAI/Mistral), unify timeouts/error mapping, and redact PII before metrics/logging.
- Value: Prevents vendor lock-in and noisy failures; keeps logs safe; gives clear latency/error visibility.

3) [x] PR-003: context-service-skeleton
- Scope: `ContextService` with `getProject`, `getTasks`, `getTeam`, `getRecentHistory` (read-only, happy path).
- Deliverables: contracts + unit tests with repository stubs.
- Acceptance: returns stable shapes; handles empty states sanely.
- Value: Provides a single source of truth for AI context, simplifying tool code.

4) PR-004: project-health-minimal
- Scope: `POST /ai/project-health`; `ProjectHealthTool` uses `ContextService` and provider with minimal prompt.
- Deliverables: request/response DTOs; schema validation; unit tests.
- Acceptance: adheres to `ProjectHealthResponseDto`; p95 < 3s in staging sample.
- Value: First real user value—risk insights and a health score.

5) [x] PR-005: task-generator-minimal
- Scope: `POST /ai/generate-tasks` + `TaskGeneratorTool`; basic list of tasks without dependencies.
- Deliverables: DTOs + validation + tests.
- Acceptance: 3–12 tasks, no hallucinated IDs.
- Value: Converts vague asks into actionable work items quickly.

6) PR-006: security-and-rate-limiting
- Scope: JWT guard + per-project authz checks on `/ai/*`; per-user rate limits.
- Deliverables: e2e tests; configuration toggles.
- Acceptance: unauthorized blocked; limits enforced; audited via logs.
- Value: Protects sensitive project data and controls spend.

7) PR-007: observability-and-feature-flags
- Scope: metrics (requests, errors, latency, tokens), tracing spans; `AI_TOOLS_ENABLED` gating both endpoints.
- Deliverables: dashboards/queries docs; sampling strategy.
- Acceptance: metrics visible in APM/log sink; flag works.
- Value: Fast feedback loops, safe rollback/disable in production.

8) PR-008: polish-and-docs
- Scope: update API docs; finalize operational runbook (envs, limits, failure modes).
- Acceptance: clear run/rollback steps; on-call notes for failures/timeouts.
- Value: Closes the loop for onboarding, ops, and maintainability.

## Goal and Scope

Deliver two backend-driven AI features exposed via REST, powered by MCP tools inside the NestJS API:
- Project Health Check
- Smart Task Generator

Out of scope: vector search (Phase 2), rich analytics dashboards, provider cost modeling.

## System Overview

- Frontend calls NestJS REST endpoints.
- NestJS controllers call internal MCP tools (decorated services) which may call an LLM provider.
- Existing domain services provide project, task, team context.
- No direct frontend ↔ LLM calls.

Refer to high-level diagrams in `high-level-mcp-integration-mvp.md`.

## MVP Features and Contracts

### 1) Project Health Check

- Endpoint: `POST /ai/project-health`
- Request body:
```json
{
  "projectId": "string",
  "projectType": "academic | professional | personal | team",
  "includeRecommendations": true
}
```
- Response body:
```json
{
  "healthScore": 0,
  "risks": [
    { "id": "string", "title": "string", "severity": "LOW | MEDIUM | HIGH" }
  ],
  "recommendations": [
    { "id": "string", "title": "string", "rationale": "string" }
  ]
}
```
- Acceptance criteria:
  - Returns within 3s p95 for projects < 2k tasks (with warm cache/provider).
  - Health score in [0,100]. At least 0–5 risks. Recommendations optional.
  - Authorization enforces access to `projectId`.

### 2) Smart Task Generator

- Endpoint: `POST /ai/generate-tasks`
- Request body:
```json
{
  "projectId": "string",
  "requirement": "string",
  "projectType": "academic | professional | personal | team",
  "priority": "LOW | MEDIUM | HIGH"
}
```
- Response body:
```json
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "estimateHours": 0,
      "priority": "LOW | MEDIUM | HIGH",
      "dependencyIds": ["string"],
      "assigneeSuggestion": "string"
    }
  ]
}
```
- Acceptance criteria:
  - Generates 3–12 well-formed tasks for typical requirements.
  - No hallucinated IDs (dependency IDs refer to known tasks only; otherwise empty).
  - Returns within 3s p95 for prompt size < 4k tokens.

## Backend Module Layout (NestJS)

- `AiModule`
  - `AiController` with routes:
    - `POST /ai/project-health`
    - `POST /ai/generate-tasks`
  - Providers:
    - `ProjectHealthTool` (MCP tool)
    - `TaskGeneratorTool` (MCP tool)
    - `ContextService` (aggregates project, tasks, team, history)
    - `LlmProviderService` (provider abstraction; OpenAI/Mistral)

### DTOs (TypeScript)

```ts
export type ProjectType = 'academic' | 'professional' | 'personal' | 'team';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ProjectHealthRequestDto {
  projectId: string;
  projectType?: ProjectType;
  includeRecommendations?: boolean;
}

export interface HealthRiskDto {
  id: string;
  title: string;
  severity: Priority;
}

export interface HealthRecommendationDto {
  id: string;
  title: string;
  rationale: string;
}

export interface ProjectHealthResponseDto {
  healthScore: number; // 0..100
  risks: ReadonlyArray<HealthRiskDto>;
  recommendations: ReadonlyArray<HealthRecommendationDto>;
}

export interface GenerateTasksRequestDto {
  projectId: string;
  requirement: string;
  projectType?: ProjectType;
  priority?: Priority;
}

export interface GeneratedTaskDto {
  title: string;
  description: string;
  estimateHours: number;
  priority: Priority;
  dependencyIds: ReadonlyArray<string>;
  assigneeSuggestion?: string;
}

export interface GenerateTasksResponseDto {
  tasks: ReadonlyArray<GeneratedTaskDto>;
}
```

### MCP Tool Signatures (Zod-validated)

```ts
@Tool({ name: 'project_health_check' })
checkHealth(params: ProjectHealthRequestDto): Promise<ProjectHealthResponseDto>;

@Tool({ name: 'generate_tasks_from_requirement' })
generateTasks(params: GenerateTasksRequestDto): Promise<GenerateTasksResponseDto>;
```

## Context Service Contract

`ContextService` provides minimal, consistent inputs to tools:
- `getProject(projectId: string)` → project core fields
- `getTasks(projectId: string)` → tasks with status, effort, dependencies
- `getTeam(projectId: string)` → members, roles, availability
- `getRecentHistory(projectId: string)` → last N events (configurable)

## Security and Guardrails

- Enforce JWT auth and per-project authorization on all `/ai/*` endpoints.
- Redact/omit PII before LLM calls (emails, tokens, API keys, file contents unless explicitly requested).
- Rate limit `/ai/*` endpoints (per-user key) and set provider timeouts.
- Log prompt and response metadata only (sizes, timings, model, cost estimates); never raw content in production logs.

## Observability

- Metrics: request count, error count, p95 latency, token usage by model.
- Tracing spans: `ai.controller`, `llm.call`, `context.load`.
- Feature flag: `AI_TOOLS_ENABLED` to short-circuit endpoints with 503 when disabled.

## Error Handling & Fallbacks

- On provider timeout/error: return 502 with `retryAfterMs` and a stable error code.
- If context loads partially, proceed with available data and annotate `degraded: true` in responses.
- Validate outputs against DTO schemas; on validation failure, return 502 and log details.

## Acceptance Checklist (Definition of Done)

- Endpoints return specified DTOs and pass schema validation.
- Authz enforced and covered by tests.
- p95 latency < 3s in staging with a representative dataset.
- Metrics and logs visible in the chosen APM/log sink.
- Feature flag works and is documented.

## Phase 2 (Brief)

- Add `VectorService` backed by Supabase vectors for semantic retrieval.
- Extend tools to optionally query semantic context (similar tasks, issues, docs).
- Keep MVP contracts stable; add fields behind optional flags only.

## Phase 3: Task Generator Maximal Version (Prospective)

### Enhanced Task Generation Capabilities

Building on the minimal PR-005 implementation, the maximal version would include:

#### 1) Advanced Task Intelligence
- **Task Dependencies**: Generate parent-child relationships and task dependencies
- **Effort Estimation**: AI-powered story points or time estimates
- **Task Templates**: Reusable task patterns for common project types
- **Smart Categorization**: Auto-tag tasks by type (frontend, backend, testing, etc.)
- **Priority Intelligence**: Context-aware priority assignment based on project phase

#### 2) Multi-Modal Input Support
- **File Upload**: Analyze project files, specs, or requirements documents
- **Image Analysis**: Extract tasks from wireframes, mockups, or diagrams
- **Voice Input**: Speech-to-text task generation
- **Rich Text**: Support for markdown, formatted requirements, or structured input

#### 3) Advanced Context Integration
- **Historical Analysis**: Learn from past project patterns and success rates
- **Team Expertise**: Factor in team member skills and availability
- **Project Templates**: Industry-specific task generation (SaaS, e-commerce, mobile, etc.)
- **Cross-Project Learning**: Apply insights from similar projects in the organization

#### 4) Enhanced Output Formats
- **Task Hierarchies**: Generate complete project breakdown structures
- **Gantt Charts**: Timeline-aware task generation with dependencies
- **Kanban Boards**: Status-aware task organization
- **Sprint Planning**: Agile-focused task breakdown with story points
- **Risk Assessment**: Identify potential blockers and mitigation tasks



#### 6) Advanced AI Features
- **Multi-LLM Support**: Different models for different task types
- **Custom Prompts**: User-defined generation templates
- **Learning Mode**: Improve suggestions based on user feedback
- **A/B Testing**: Compare different generation strategies
- **Confidence Scoring**: AI confidence levels for each generated task


