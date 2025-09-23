# PR-002 — Provider Abstraction and Config Hardening

## References
- Operational MVP Spec: `docs/operational-mcp-integration-spec.md` [spec:OPS-MVP]
- Phase 0/1 code: `src/ai/*` (provider/types, service, controller)

## Summary & Scope
- Objective: Make AI provider selection safe, swappable, observable, and well-validated.
- In-scope:
  - Single provider interface with pluggable adapters (Mistral default, OpenAI optional)
  - Strict config validation (env schema, startup checks)
  - Unified timeout/error mapping to stable internal errors
  - Redaction before metrics/logging
  - Minimal metrics for latency/errors and model usage
- Out of scope:
  - Advanced caching, retries across providers, cost dashboards

## Assumptions & Constraints
- Default provider: `mistral`. Optional `openai` adapter.
- OpenAI-compatible clients used (baseURL set for Mistral).
- p95 target < 3s end-to-end (provider timeout ≤ 2.5s).

## Open Questions (Blocking)
- [ ] Final error code taxonomy (e.g., AI_PROVIDER_TIMEOUT, AI_PROVIDER_AUTH, AI_PROVIDER_BAD_REQUEST, AI_PROVIDER_UNAVAILABLE)? Owner: Backend
- [ ] Log sink tags: which labels are mandatory (model, latencyMs, success, errorCode)? Owner: Infra

## Incremental Plan

### 1) Provider Interface & Adapters
- [ ] Finalize `AiProvider` contract (getInfo, complete, stream?) and error classes in `src/ai/provider.types.ts` [spec:OPS-MVP]
- [ ] Implement `MistralProvider` adapter (OpenAI client + baseURL) [spec:OPS-MVP]
- [ ] Implement `OpenAiProvider` adapter (standard OpenAI client) [spec:OPS-MVP]
- [ ] Add simple factory `ProviderFactory` that returns adapter by `LLM_PROVIDER` [spec:OPS-MVP]

### 2) Config Validation & Startup Checks
- [ ] Extend `validation.schema.ts` for: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_MAX_TOKENS`, `LLM_TIMEOUT_MS` (strict defaults, non-empty API key when enabled) [spec:OPS-MVP]
- [ ] Add `AiBootstrapService` to validate provider/model on boot (dry-run capability off-by-default) [spec:OPS-MVP]

### 3) Error Mapping & Redaction
- [ ] Map provider exceptions to stable internal errors (timeout/auth/bad-request/unavailable) [spec:OPS-MVP]
- [ ] Redact PII before metrics/logging (never log prompts/responses in prod) [spec:OPS-MVP]

### 4) Observability
- [ ] Metrics: `ai.provider.request`, `ai.provider.error`, `ai.provider.latency` (ms), labels: `provider`, `model`, `errorCode` [spec:OPS-MVP]
- [ ] Trace spans: `llm.call` with provider/model and timing [spec:OPS-MVP]

### 5) Tests & Docs
- [ ] Unit tests for factory and adapters (timeout/auth/bad-request mapping) [spec:OPS-MVP]
- [ ] Unit tests for config validation and bootstrap guard [spec:OPS-MVP]
- [ ] Update runbook with env examples, failure modes, toggle procedures [spec:OPS-MVP]

## API/Types Impact
- [ ] No public DTO shape changes for Phase 1 endpoints
- [ ] Internal: `AiProvider` types extended; `AiService` consumes provider via factory

## Acceptance Criteria
- [ ] Switching `LLM_PROVIDER` between `mistral` and `openai` requires no code changes
- [ ] Startup fails fast with clear error if `AI_TOOLS_ENABLED=true` and `LLM_API_KEY` missing
- [ ] Timeout/auth/bad-request errors return stable internal codes; logs do not include raw prompts/responses
- [ ] Metrics show per-provider latency and error counts

## Definition of Done
- [ ] Provider interface + Mistral/OpenAI adapters + factory implemented and tested
- [ ] Config validation and bootstrap checks in place
- [ ] Error mapping + redaction enforced; basic metrics emitted
- [ ] Runbook updated with envs and failure modes

## Changelog
- 2025-09-23: Initial PR-002 battle plan drafted per OPS-MVP.
