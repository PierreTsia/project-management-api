# PR-005 Task Generator - Usage Guide

## Overview

The Task Generator provides AI-powered task breakdown from natural language requirements. It uses MCP tools with LLM providers to generate 3-12 actionable tasks.

## Endpoint

```
POST /ai/generate-tasks
```

## Request Format

```json
{
  "prompt": "Create a user authentication system",
  "projectId": "optional-project-id",
  "locale": "en"
}
```

### Fields

- `prompt` (required): Natural language description of what you want to accomplish
- `projectId` (optional): Project ID for context-aware task generation
- `locale` (optional): Language preference (defaults to "en")

## Response Format

```json
{
  "tasks": [
    {
      "title": "Design authentication flow",
      "description": "Create user flow diagrams and wireframes",
      "priority": "HIGH"
    },
    {
      "title": "Implement login endpoint",
      "description": "Build secure login API with JWT tokens",
      "priority": "HIGH"
    },
    {
      "title": "Add password hashing",
      "description": "Implement bcrypt for secure password storage",
      "priority": "MEDIUM"
    }
  ],
  "meta": {
    "model": "mistral-small-latest",
    "provider": "mistral",
    "degraded": false
  }
}
```

## cURL Examples

### Basic Task Generation

```bash
curl -X POST http://localhost:3000/ai/generate-tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "prompt": "Build a REST API for managing users"
  }'
```

### With Project Context

```bash
curl -X POST http://localhost:3000/ai/generate-tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "prompt": "Add user profile management",
    "projectId": "proj_123",
    "locale": "en"
  }'
```

## Environment Configuration

### Required Environment Variables

```bash
# Enable AI tools
AI_TOOLS_ENABLED=true

# LLM Provider Configuration
LLM_PROVIDER=mistral  # or "openai"
MISTRAL_API_KEY=your_mistral_key
OPENAI_API_KEY=your_openai_key  # if using OpenAI

# Optional: Task generation timeout
LLM_TASKGEN_TIMEOUT_MS=30000  # 30 seconds default
```

### Feature Flags

- `AI_TOOLS_ENABLED`: Must be `true` to enable the endpoint (returns 503 when disabled)

## Error Handling

### Common Error Responses

```json
{
  "statusCode": 503,
  "message": "AI tools are disabled",
  "error": "Service Unavailable"
}
```

```json
{
  "statusCode": 400,
  "message": "Must generate at least 3 tasks",
  "error": "Bad Request"
}
```

### Degraded Mode

When `projectId` is provided but context loading fails, the response includes `"degraded": true` in the meta object. The tool will still generate tasks but without project-specific context.

## Rate Limiting

The endpoint is protected by JWT authentication and subject to rate limiting per user. Check the `X-RateLimit-*` headers for current limits.

## Monitoring

### Metrics

- `ai.taskgen.request`: Request count
- `ai.taskgen.error`: Error count  
- `ai.taskgen.latency`: Response latency

### Tracing

- `ai.taskgen.call`: Main tool execution span
- `llm.call`: LLM provider call span
- `context.load`: Context loading span

## Validation Rules

- Tasks: 3-12 tasks per request
- Title: 1-80 characters
- Description: 0-240 characters (optional)
- Priority: LOW, MEDIUM, or HIGH (optional)

## Fallback Behavior

If the LLM response is malformed or fails validation, the tool returns a default set of 3 generic tasks:

1. "Analyze requirements"
2. "Create implementation plan" 
3. "Execute implementation"

This ensures the endpoint always returns a valid response structure.
