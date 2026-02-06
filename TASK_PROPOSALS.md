# Task Proposals After Codebase Review

## Project understanding (high-level)
This repository implements an AI-assisted document comparison workflow:
- A React/Vite frontend uploads single PDFs or matched directory pairs, computes structured diffs, and augments diffs with AI reasoning.
- A FastAPI backend provides optional remote PDF parsing (`/parse`) and rulebook retrieval endpoints used for RAG-style advisory analysis.

## Alignment with intended product flow
Based on the described flow (Difference Analyzer → Expectation Reasoning + Memory Learning + Risk Escalation), these tasks are chosen to preserve decision quality and reviewer trust:
- Keep labeling polished and consistent in the UI.
- Ensure batch mode uses the same parsing configuration as single-file mode, so upstream diff quality is consistent.
- Keep status documentation accurate to avoid escalation/reporting drift.
- Replace manual scripts with executable tests to protect the pipeline over time.

## 1) Typo fix task
**Task:** Standardize product name spelling from **"Docdiff"** to **"DocDiff"** in user-facing UI copy.

**Why:** The app header currently renders `AI-Powered Docdiff`, which looks like a typo/incorrect capitalization for a product name.

**Scope suggestion:**
- Update UI label(s) where the product name appears.
- Do not change localStorage keys unless a migration plan is defined.

**Acceptance criteria:**
- All visible product-name labels use a single canonical spelling.
- No regression to existing persisted settings keys.

## 2) Bug fix task
**Task:** Pass `aiConfig` into batch-mode PDF parsing so batch mode respects remote parsing configuration.

**Why:** `parsePdf` supports config flags (such as `useRemoteParser`, `remoteUrl`, and fallback behavior), but batch processing calls `parsePdf(pair.oldFile)` and `parsePdf(pair.newFile)` without config.

**Scope suggestion:**
- Update batch pipeline to call `parsePdf(file, aiConfig)`.
- Add a regression test to ensure `useRemoteParser` can be honored in batch mode.

**Acceptance criteria:**
- Batch and single-file flows use consistent parsing configuration semantics.
- If remote parser is enabled, both flows attempt remote parse before local fallback.

## 3) Code comment/documentation discrepancy task
**Task:** Fix `processBatch` JSDoc return/status documentation to match actual runtime statuses.

**Why:** The JSDoc says status is `('Passed'|'Failed'|'Error')`, but implementation also emits `'Review Needed'`.

**Scope suggestion:**
- Update JSDoc in `src/services/batchProcessor.js`.
- Optionally add type annotations (e.g., typedef union) to prevent drift.

**Acceptance criteria:**
- Documented status enum exactly matches all statuses emitted in code.
- No stale status strings remain in comments for this API.

## 4) Test improvement task
**Task:** Replace ad-hoc backend scripts with automated assertions using a real test runner.

**Why:** Existing files `backend/test_server.py` and `backend/test_retrieve.py` are executable scripts with print/debug behavior, not structured tests with assertions/fixtures.

**Scope suggestion:**
- Introduce `pytest` tests for key backend routes (`/`, `/parse`, `/advisory/retrieve`) with FastAPI `TestClient`.
- Mock external dependencies where needed (Docling initialization, LLM/retrieval calls).

**Acceptance criteria:**
- `pytest` can run tests non-interactively in CI.
- Tests assert status codes and response shapes instead of relying on manual output inspection.
