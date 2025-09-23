# MCP Integration MVP — Phase 0 Foundations (AI-Phase-0)

## References
- High-Level Architecture: `docs/high-level-mcp-integration-mvp.md` [spec:HL-ARCH]
- Operational MVP Spec: `docs/operational-mcp-integration-spec.md` [spec:OPS-MVP]
- MCP Server Implementation Guide: `docs/mcp-server-implementation-guide.md` [spec:IMPL-GUIDE]
- MCP-Nest (NestJS MCP module): `https://github.com/rekog-labs/MCP-Nest` [spec:MCP-NEST]

## Summary & Scope
- Objective: Establish safe, observable, reversible foundations to enable the AI MVP without shipping full user-facing features.
- In-scope:
  - Create `AiModule` scaffold with minimal controller and provider wiring.
  - Add feature flag `AI_TOOLS_ENABLED` and base configuration for LLM provider.
  - Expose `POST /ai/hello` returning deterministic payload from selected provider (no project data).
  - Define stable contracts for `ContextService` (interfaces only) and DTO types.
  - Basic auth guard wiring on `/ai/*` routes; stub rate limiting switch.
  - Observability skeleton: metrics/tracing names reserved; minimal logs.
  - CI/CD secrets and environment parity notes.
- Out of scope:
  - Full `ProjectHealthTool` and `TaskGeneratorTool` logic (Phase 1+).
  - Vector search and Supabase integration (Phase 2).
  - Frontend UI beyond sanity check call.

## Assumptions & Constraints
- JWT auth already exists and can guard `/ai/*` [spec:OPS-MVP].
- Default provider: Mistral (OpenAI-compatible API), chosen for cost efficiency.
- One provider enabled at a time with timeouts capped at 3s p95 target [spec:OPS-MVP].
- No PII leaves the system; `/ai/hello` may echo an optional request body field `name` in the response but must not log or persist it.
- Rollout behind `AI_TOOLS_ENABLED`; default off in production.

## Decisions (Phase 0)
- Provider: Mistral by default; keep adapter interface to allow swapping later.
- Observability: keep it simple for Phase 0 (lightweight counters/timers/spans, no vendor APM binding yet).
- Secrets: repo `.env` for local/dev; mirror required vars into Fly.io secrets for production.
- MCP runtime: adopt MCP-Nest for tool exposure (`@rekog/mcp-nest`) starting Phase 1; minimal wiring can land in Phase 0 behind the feature flag. [spec:MCP-NEST]

## Open Questions (Blocking)
- [x] Provider choice for Phase 0 default (`OPENAI` vs `MISTRAL`)? Owner: Tech Lead → Mistral
- [x] Metrics sink preference (APM/logs): which labels and sampling? Owner: Infra → Simple built-in metrics/logs; no APM vendor yet
- [x] Exact CI secrets management source (Fly.io secrets vs repo env vs 1Password)? Owner: DevOps → Repo env for dev, mirrored to Fly secrets for prod

## Incremental Plan

### Phase 0 — Groundwork and Hello Flow
- [x] Add `AiModule` with `AiController` and `LlmProviderService` scaffolding (no business logic) (depends on: config) [spec:OPS-MVP]
- [x] Introduce `AI_TOOLS_ENABLED` feature flag (env + config service + early-return 503 in controller when disabled) [spec:OPS-MVP]
- [ ] Add provider config: `LLM_PROVIDER` (default `mistral`), `LLM_API_KEY`, `LLM_MODEL`, `LLM_MAX_TOKENS`, `LLM_TIMEOUT_MS` with strict validation [spec:OPS-MVP][spec:IMPL-GUIDE]
- [x] Implement `POST /ai/hello` returning `{ provider, model, message: "hello" | "hello {name}" }` using optional request body `{ name }` and provider adapter (non-streaming); redact `name` from logs and traces [spec:OPS-MVP]
- [x] Create provider interface and null-safe adapter(s) (Mistral default, OpenAI optional) with timeout/error mapping (return stable error codes) [spec:OPS-MVP]
- [x] Define DTO shapes (TypeScript types/interfaces) for Phase 1 endpoints now to avoid churn (`ProjectHealthRequestDto`, etc.) [spec:OPS-MVP]
- [x] Define `ContextService` interfaces only: `getProject`, `getTasks`, `getTeam`, `getRecentHistory` (read-only shapes) [spec:OPS-MVP]
- [x] Wire `JwtAuthGuard` on all `/ai/*` routes; reject when unauthenticated [spec:OPS-MVP]
- [x] Reserve observability: counters `ai.request`, `ai.error`, histograms `ai.latency`, trace spans `ai.controller`, `llm.call` (no APM binding yet) [spec:OPS-MVP]
- [x] Add minimal e2e test: `/ai/hello` behind flag (off→503, on→200) with auth required [spec:OPS-MVP]
- [x] Document env matrix and failure modes in `docs/` (timeouts, rate limit toggle, feature flag ops) [spec:OPS-MVP]
- [x] Install and minimally wire MCP-Nest dependencies (`@rekog/mcp-nest`, `@modelcontextprotocol/sdk`, `zod`) with placeholder module registration gated by `AI_TOOLS_ENABLED` (no tools yet) [spec:MCP-NEST]

### Handoffs and Prep for Phase 1
- [ ] Draft request/response JSON examples for `POST /ai/project-health` and `POST /ai/generate-tasks` (contract snapshots) [spec:OPS-MVP]
- [ ] Add placeholders for rate limiting decorator/guard strategy (disabled by default) [spec:OPS-MVP]
- [ ] Add provider selection smoke tests (env-driven) ensuring safe fallback when unset [spec:OPS-MVP]
- [ ] Draft `ProjectHealthTool` and `TaskGeneratorTool` signatures using MCP-Nest `@Tool()` decorators with Zod params [spec:MCP-NEST]

## API/Schema & Types Impact
- [ ] Create `src/ai/types.ts` exporting:
  - `ProjectType`, `Priority` unions
  - `ProjectHealthRequestDto`, `ProjectHealthResponseDto`
  - `GenerateTasksRequestDto`, `GenerateTasksResponseDto`
- [ ] Create `src/ai/context.types.ts` defining `ContextService` interfaces for `getProject`, `getTasks`, `getTeam`, `getRecentHistory` (read-only shapes) [spec:OPS-MVP]
- [ ] Create `src/ai/provider.types.ts` for provider interface with typed errors (`AiProviderTimeoutError`, `AiProviderAuthError`, `AiProviderBadRequestError`).

## UX Acceptance Criteria & Test Plan
- [ ] When `AI_TOOLS_ENABLED=false`, `POST /ai/hello` returns `503` with stable code `AI_DISABLED`.
- [ ] When `AI_TOOLS_ENABLED=true` and user is unauthenticated, returns `401`.
- [ ] When enabled and authenticated, returns `200` with `{ provider, model, message: "hello" }` if no `name` provided, and `{ provider, model, message: "hello {name}" }` when body includes `{ "name": "Alice" }`, in <300ms p95 locally.
- [ ] Unit tests: provider adapter returns mapped error classes on timeout/401; logging redacts `name`.
- [ ] e2e tests: feature flag gating and auth guard coverage; no persistence of request body fields.

## Risks & Mitigations
- **Misconfigured provider keys**: Add boot-time config validation and health log at startup; return `502` on call with `retryAfterMs` suggestion. 
- **Vendor lock-in**: Single interface with adapters; keep prompts and DTOs provider-agnostic.
- **Cost leakage**: Phase 0 avoids any real token-heavy calls; hello is deterministic and short.
- **Observability gaps**: Reserve metric names and trace spans now; wire APM in Phase 1.

## Rollout & Feature Flags
- Flag: `AI_TOOLS_ENABLED` (env + runtime config).
- Default: Off in production/staging until Phase 0 validated.
- Rollout steps: enable on dev → staging smoke → prod canary (1% traffic to `/ai/hello`).
- Metrics: `ai.request`, `ai.error`, `ai.latency.p95` (stubbed), log request IDs.

## Definition of Done
- [x] `AiModule` registered; `/ai/hello` endpoint live behind auth + flag.
- [x] Provider config validated at startup; safe error mapping in place.
- [x] DTO contracts added and exported; `ContextService` interfaces defined.
- [x] Basic tests passing (unit + e2e for flag/auth/hello).
- [x] Ops notes documented (envs, failure modes, enable/disable procedure).

## Changelog
- 2025-09-23: Initial Phase 0 plan drafted from specs [HL-ARCH][OPS-MVP][IMPL-GUIDE]. 🚀
- 2025-09-23: Allow optional `name` echo in `/ai/hello`; added redaction & no-persistence criteria.
- 2025-09-23: Decisions recorded — Mistral default, simple observability, Fly secrets mirrored from repo env.
- 2025-09-23: Added MCP-Nest adoption and Phase 0 wiring tasks. [spec:MCP-NEST]
