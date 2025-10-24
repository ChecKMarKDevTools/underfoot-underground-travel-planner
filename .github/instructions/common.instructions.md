---
applyTo: '**/*'
---

# Common Project Instructions (short)

Use this file for cross-cutting constraints shared by frontend and backend. Keep details in respective `AGENTS.md` files (source-of-truth).

Essential rules:

- Commit messages: Conventional Commits enforced by `commitlint` (do not add `Signed-off-by:` trailers).
-- Pre-commit hooks: `lefthook` runs `eslint` and `prettier` (spellcheck removed). All checks must pass before committing.
- Node: prefer Node 24+ for frontend; Node 22+ supported in CI. Use the repo `package.json` scripts.
- Python: runtime 3.12+ for backend; use `poetry` to manage dependencies and run tests.
- Tests & Coverage: frontend coverage targets are stricter (see `frontend/AGENTS.md`); backend target ≥30% (see `backend/AGENTS.md`).
- Secrets: store in environment variables and Pydantic settings (backend) or `VITE_` env vars (frontend). Never commit secrets or log them in responses.
- Security: sanitize user inputs, restrict CORS to allowed origins, and avoid storing PII.
- AI calls: prefer a single batch call where architected (backend `/chat`) to reduce cost.

If a rule conflicts with an `AGENTS.md` file, treat `AGENTS.md` as authoritative for that area and update this file accordingly.

## CRITICAL CONSTRAINTS

- **No Committing**: Never commit any code without explicit direct approval by the user.
