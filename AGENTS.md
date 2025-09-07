# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: App shell and UI layout (tabs, tools, canvas, drawer).
- `styles.css`: Visual styles for toolbar, canvas, thumbnails, and drawer.
- `app.js`: Core logic (painting/erasing on canvas, image layering, thumbnails, swipe/page nav, palette, state).
- `docs/requirements.md`: Product requirements.
- `img/animals`, `img/vehicles`: Expected production line-art PNGs (black lines, transparent background). Fallbacks live in `docs/img/`.

## Build, Test, and Development Commands
- Run locally (no build step):
  - `open index.html` (macOS) or open in your browser.
  - Or serve statically: `python3 -m http.server 5173` then visit `http://localhost:5173`.
- Format (optional): `npx prettier -w .` if you use Prettier locally.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; UTF-8; Unix line endings.
- JavaScript: ES syntax; camelCase for variables/functions; constants in UPPER_SNAKE (`PALETTE`, `MANIFEST`). Small, focused functions with clear names (verbs for actions: `loadPage`, `renderThumbs`).
- CSS: kebab-case class names; low specificity; prefer utility classes over deep nesting.
- Files: lowercase with hyphens; assets under `img/<category>/<n>.png`.

## Testing Guidelines
- No automated tests yet. If adding:
  - Place specs under `tests/`; name `*.spec.js`.
  - Prefer E2E smoke tests (Playwright/Cypress) covering: painting, erasing, thumbnail switch, swipe nav, resize alignment, per-page paint restore.
  - Example: `npx playwright test` (after setting up Playwright).
- Manual checklist for PRs: layer order (line art on top), brush latency, eraser transparency, page navigation, and persistence.

## Commit & Pull Request Guidelines
- Commits: imperative mood + scope. Examples:
  - `feat(paint): add 12-color palette`
  - `fix(nav): ignore swipe when drawing`
- PRs: clear description, linked issues, before/after screenshots or short GIFs, manual test steps, and updated docs when behavior changes (`AGENTS.md`, `docs/requirements.md`). Keep changes focused and avoid unrelated formatting churn.

## Security & Configuration Tips
- Use local, same-origin PNGs to avoid tainting the canvas; keep images reasonably sized (≤ 2000px longest side) to balance quality and performance.
- Line art must remain the top layer; user paint stays on the canvas underneath. Update `MANIFEST` in `app.js` when adding/replacing assets to preserve per-page paint state.
