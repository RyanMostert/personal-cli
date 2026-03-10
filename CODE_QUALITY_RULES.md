# Code Quality Rules

## Purpose

These rules ensure the codebase remains maintainable and prevents technical debt accumulation.

---

## File Organization Rules

### 1. Single Responsibility

- Each file should have one primary purpose (component, hook, utility, type)
- No mixed content (e.g., don't mix utilities with components)

### 2. File Size Limits

| Metric                 | Limit | Enforcement                      |
| ---------------------- | ----- | -------------------------------- |
| Max lines per file     | 400   | ESLint: `max-lines`              |
| Max lines per function | 100   | ESLint: `max-lines-per-function` |
| Max complexity         | 10    | ESLint: `complexity`             |

### 3. Naming Conventions

- **Components**: PascalCase (`MyComponent.tsx`)
- **Hooks**: camelCase starting with `use` (`useMyHook.ts`)
- **Utilities**: camelCase (`myUtility.ts`)
- **Types**: PascalCase (`MyType.ts`)
- **Constants**: SCREAMING_SNAKE_CASE

---

## TypeScript Rules

### 1. No `any` Type

```typescript
// BAD
const data: any = getData();

// GOOD
const data: MyType = getData();
```

- Rule: `@typescript-eslint/no-explicit-any: error`

### 2. No Unused Variables

```typescript
// BAD
const unused = 'hello';

// GOOD - prefix with _ or remove
const _unused = 'hello';
```

- Rule: `@typescript-eslint/no-unused-vars: error`

### 3. Explicit Return Types

For exported functions, always define return types:

```typescript
// GOOD
export function getData(): MyType { ... }
```

---

## Code Style Rules

### 1. Line Length

- Max 100 characters per line
- Prettier: `printWidth: 100`

### 2. Import Organization

Order imports alphabetically, grouped by:

1. External libraries (React, etc.)
2. Internal packages (@personal-cli/\*)
3. Relative imports (./, ../)

### 3. No Magic Numbers

```typescript
// BAD
if (count > 20) { ... }

// GOOD
const MAX_ITEMS = 20;
if (count > MAX_ITEMS) { ... }
```

---

## React-Specific Rules

### 1. Hook Dependencies

Always include all dependencies in useEffect/useCallback:

```typescript
// BAD
useEffect(() => {
  doThing(a);
}, [a]);

// GOOD
useEffect(() => {
  doThing(a, b);
}, [a, b]);
```

Rule: `react-hooks/exhaustive-deps: warn`

### 2. No State in Effects

Avoid calling setState synchronously within useEffect:

```typescript
// BAD
useEffect(() => {
  setValue(computeValue());
}, []);

// GOOD - compute during render or use useMemo
const value = useMemo(() => computeValue(), [dep]);
```

---

## Testing Rules

### Required Test Coverage

- All utility functions must have tests
- All exported functions from core packages must have tests
- Minimum: core logic, providers, persistence

---

## Pre-commit Checklist

Before committing:

- [ ] Run `pnpm lint` - must pass
- [ ] Run `pnpm format` - must pass
- [ ] No new `any` types introduced
- [ ] No file exceeds 400 lines
- [ ] No function exceeds 100 lines
- [ ] Complexity under 10

---

## CI Enforcement

Add to CI pipeline:

```yaml name: Lint
  run: p
-npm lint

- name: Format Check
  run: pnpm format --check
```

---

## Breaking the Rules

If you must break a rule (rare cases):

1. Document why in a comment
2. Add TODO to review later
3. Create issue to track remediation
