# Agent: story-to-spec

Converts a User Story + Acceptance Criteria all the way to a runnable Playwright spec,
spawning specialized subagents for each stage of the pipeline.

## When to use

Invoke when a Product Owner hands you a User Story and you need:
1. Structured manual test cases (`.md` files)
2. A matching Playwright spec (`.spec.ts`)
3. Any missing page objects / locators scaffolded

## Trigger

```
/agent story-to-spec
```

Then paste the User Story when prompted, or pass it as a file path:

```
/agent story-to-spec --story path/to/story.md
```

## Workflow

```
story-to-spec (parent)
  ├── ingest: User Story + ACs
  ├── spawns: tc-author (subagent)           ← generates test case .md files
  ├── spawns: coverage-checker (subagent)    ← checks existing TestCases/ for overlap [parallel with tc-author once story is parsed]
  ├── reviews TC output, deduplicates with coverage-checker result
  ├── spawns: spec-builder (subagent)        ← generates .spec.ts from final TCs
  ├── spawns: pom-scaffolder (subagent)      ← scaffolds missing page objects [parallel with spec-builder]
  └── reports: files created, checklist, next steps
```

## Subagents spawned

### `tc-author` (subagent)

- **Input:** Parsed User Story (actor, ACs, module name, existing TC IDs)
- **Task:** Apply `user-story-to-test-case` skill; produce one TC per AC scenario
- **Output:** Array of `TestCaseConfig` objects + markdown file paths
- **Skills used:** `user-story-to-test-case`, `test-case-generator`

### `coverage-checker` (subagent)

- **Input:** Feature keywords from the User Story
- **Task:** Search `test-cases/` for existing test cases that cover the same flows
- **Output:** List of existing TC IDs that overlap, so `tc-author` results can be deduplicated
- **Runs in parallel** with `tc-author` after story parsing completes

### `spec-builder` (subagent)

- **Input:** Final `TestCaseConfig[]` after deduplication
- **Task:** Write `tests/e2e/<feature>.spec.ts` (or `tests/api/`) using page object methods
- **Output:** Path to the new spec file
- **Skills used:** `page-object-model`, `test-case-generator`
- **Rules:**
  - No raw selectors in spec — all locators go through page objects
  - Import page objects from `pages/`; import URLs from `config/urls.ts`
  - One `test()` block per TC

### `pom-scaffolder` (subagent)

- **Input:** Element names referenced in the test cases (from step descriptions)
- **Task:** Check `pages/` for existing page objects; scaffold any missing ones
- **Output:** List of updated/created page object files
- **Skills used:** `page-object-model`, `self-healing-locators`
- **Rules:**
  - Extend `BasePage`
  - Every element uses `this.heal(...)` with at least 2 strategies
  - Scaffold stubs for unknown elements (mark with `// TODO: add real selectors`)

## Steps (parent agent)

### 1. Ingest User Story

Ask the user to paste the User Story if not already provided.
Extract: actor, feature name, module slug (for TC-MODULE-NNN), list of ACs.

### 2. Determine module and ID range

```bash
ls test-cases/<type>/<feature>/
```

Find the highest existing TC-MODULE-NNN to determine the starting ID for new cases.

### 3. Spawn tc-author and coverage-checker in parallel

Both subagents receive the parsed story. Wait for both.

### 4. Deduplicate

Remove any TCs from `tc-author` output that duplicate IDs already in `coverage-checker` output.
Report overlaps to the user: "These scenarios are already covered: TC-X-001, TC-X-002. Skipping."

### 5. Save test cases

Write each `TestCaseConfig` to `test-cases/<type>/<feature>/TC-<MODULE>-<NNN>.md`.
Validate with `TestCaseParser.autoFix()` before saving.

### 6. Spawn spec-builder and pom-scaffolder in parallel

Both receive the final TC list. Wait for both.

### 7. Report

```
story-to-spec complete
─────────────────────────────────────
Test cases created : 4  (TC-INV-005 → TC-INV-008)
Spec file          : tests/e2e/invoice.spec.ts
Page objects       : pages/InvoicePage.ts (updated)
                     pages/ApprovalPage.ts (scaffolded — TODOs inside)
Skipped (overlap)  : TC-INV-003, TC-INV-004

Next steps:
1. Fill in TODO locators in pages/ApprovalPage.ts
2. Run: npx playwright test tests/e2e/invoice.spec.ts --headed
3. Run /agent qa-pipeline to triage any failures
```

## Rules

- Never hardcode selectors in spec files.
- Never hardcode URLs — always import from `config/urls.ts`.
- Every TC must pass `TestCaseParser` validation before being saved.
- TCs go in `test-cases/<type>/<feature>/`, never flat in `test-cases/`.
- Specs go in `tests/e2e/<feature>.spec.ts` (or `tests/api/` for API-only ACs).
- `pom-scaffolder` must scaffold stubs rather than leave specs with missing imports.

## Related skills

- [user-story-to-test-case](../../skills/user-story-to-test-case/README.md)
- [test-case-generator](../../skills/test-case-generator/README.md)
- [page-object-model](../../skills/page-object-model/README.md)
- [self-healing-locators](../../skills/self-healing-locators/README.md)
