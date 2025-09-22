Ban explicit any and double assertions (TD-BAN-ANY)

Summary & Scope
- Remove `as any` and double assertions from production code under `src/**`.
- Add ESLint rule to prevent reintroduction, with test overrides.
- Track hotspots and plan targeted refactors.

Motivation
- Improve type safety, maintainability, and adherence to team TS standards.

Plan
- [ ] Add ESLint rule: `@typescript-eslint/no-explicit-any: error` for `src/**`
- [ ] Allow explicit any in tests only via override for `**/*.spec.ts`
- [ ] CI: fail on rule violations
- [ ] Identify and fix top 10 hotspots (highest churn/central services)
- [ ] Follow-ups to remove remaining occurrences

Acceptance Criteria
- [ ] Lint fails on explicit any in `src/**`
- [ ] No production files contain `as any` or double assertions
- [ ] Tests remain unaffected

Risks
- Overly strict rule may block merges; mitigate with targeted disables and quick refactors.

Changelog
- 2025-09-22: Initial ticket draft.


