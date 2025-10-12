# .copilot-instructions.md

## Persona

You are assisting with a quirky, snarky, offbeat travel-planner project.
Code style and tooling are important. You should write and refactor code in a way that passes all pre-commit hooks without breaking the project vibe.

## Critical Constraints

- All commits must pass:
  1. **Commitlint** — Conventional Commit messages required
     - Ignore GPG signature failures (signing happens post-hook)
     - Never add a `Signed-off-by:` trailer to generated commit messages. This repo's `commitlint` configuration treats `Signed-off-by` as an enforcement that will cause commits to fail; do not attempt to satisfy or edit commitlint configuration to add it.
     - Preserve existing trailers such as `Co-authored-by:` (for example: `Co-authored-by: Name <email>`). Do not remove or replace `Co-authored-by` footers when present.
  2. **CSpell** — No spelling errors in code or markdown
  3. **Prettier** — Enforce formatting rules for JS/TS/MD/etc.
  4. **ESLint** — Lint code according to project config
- Pre-commit hooks are run via **lefthook**.
- Any generated code must be compatible with **Node 22 LTS** (or later LTS).

### IMPORTANT: No sed or ad-hoc `npm pkg set` in automation

- Do not use `sed`, `awk`, or other ad-hoc text-manipulation tools to edit project source or configuration files in automated scripts, CI jobs, or programmatic code modifications unless there is absolutely no practical alternative.
  - These tools are brittle for structured files (JSON, YAML, JS/TS) and frequently introduce syntax errors, escaping issues, or file corruption.
  - Instead, prefer:
    - Programmatic edits using a proper parser (JSON.parse / JSON.stringify, or an AST tool for JS/TS).
    - The official `npm pkg set`/`npm pkg get` CLI only for interactive, manual updates. If `npm pkg set` must be used in automation, run `prettier --write` immediately afterwards and ensure the operation is staged and validated by CI.
    - Using Prettier (`prettier --write`) or the project's formatting scripts as the last step after any programmatic change to ensure consistent formatting.
- Never run `npm pkg set` from a hook or script without following it with the repository formatter (Prettier) and a verification step. Programmatic package.json edits should be committed as one atomic operation and validated by CI.

## Preferred Tools and Documentation

You should use the MCP server #context7 whenever it is available to reference the latest versions of all documentation.

- **Commitlint** for message validation
- **CSpell** for spelling checks
- **Prettier** for consistent formatting
- **ESLint** for code quality
- **lefthook** to run checks pre-commit

## Development Workflow

1. Write code with passing lint/format/spell checks from the start.
2. Follow Conventional Commits for all commit messages.
3. Expect hooks to run locally before the commit is accepted.
4. Do not bypass pre-commit hooks unless explicitly instructed.
5. GPG signature failures in commitlint are acceptable until commit is signed manually.

## Output Guidelines

- Write code that passes all configured hooks on the first try.
- Generate commit messages in the Conventional Commit style:
  - Format: `type(scope): short description`
  - Example: `feat(ui): add chatbot interface for travel planning`
- Keep changes self-contained and relevant to the commit message.

When generating commit messages, do NOT append any `Signed-off-by:` lines or attempt to add signing trailers; they will always fail the project's commit hooks and must be left out. If a contributor or tool already provides a `Co-authored-by:` footer, keep it as-is.

# Underfoot UI — Frontend Guide

- Quirky, offbeat React 18 + Vite interface for underground travel planning.
- Chat interface, Debug View, and transparent troubleshooting.

## Tech Stack

- React 18, Vite, Tailwind CSS, Node 24+.
- Source: `frontend/src/` (App.jsx, main.jsx, components/\*)

## Linting, Formatting, Spelling

- ESLint, Prettier, CSpell enforced via lefthook pre-commit hooks.
- All code/markdown must pass before commit.

## Unit Testing

- Vitest + React Testing Library + jsdom.
