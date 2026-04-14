# Contributing to nanofetch

Thanks for your interest in contributing. This document explains how to get involved and what to expect.

## Philosophy

nanofetch is intentionally minimal — zero dependencies, small surface area, native fetch only. Before opening a PR, ask: does this add real value without adding complexity? Features that belong in userland (specific auth flows, caching strategies, framework adapters) will generally be declined.

## Getting Started

```bash
git clone https://github.com/devhnry/nanofetch.git
cd nanofetch
npm install
npm run build
```

## Making Changes

- **Bug fixes** — open an issue first describing the bug, then submit a PR referencing it
- **New features** — open an issue to discuss before writing code; saves everyone time if the direction doesn't fit
- **Docs** — PRs welcome without a prior issue

Branch off `main`, keep commits focused, and follow the existing commit style (`fix:`, `feat:`, `docs:`, `chore:`).

## Code Guidelines

- No new dependencies — this is a zero-dependency package and must stay that way
- TypeScript — all code must be fully typed, no `any` unless unavoidable
- Errors must go through `ApiError` — don't let raw `SyntaxError` or `TypeError` escape the public API
- Match the existing code style — the codebase is small, consistency matters

## Pull Request Checklist

- [ ] `npm run build` passes without errors
- [ ] No new dependencies added to `package.json`
- [ ] Types updated in `types.ts` if the public API changed
- [ ] README updated if behaviour changed or a new config option was added

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- `patch` (0.x.Y) — bug fixes
- `minor` (0.Y.0) — new features, backwards compatible
- `major` (X.0.0) — breaking changes

## License

By contributing, you agree that your changes will be licensed under the [MIT License](./LICENSE).
