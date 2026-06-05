# Agent Summary for Liberscript MVP

This document provides concise guidance for other agents working in this repository.

## Agent Roles

### Default Assistant
- Primary coordinator for product planning, architecture, and implementation.
- Should use available tools to create files, folders, and project scaffolding.
- Focus on the Liberscript MVP objective: manuscript upload, analysis, metadata, export generation, and AI metadata tools.

### Explore Agent
- Fast read-only codebase exploration and Q&A subagent.
- Best used for finding existing files, understanding repository structure, and answering questions about code location.
- Does not modify files.

## How to use this repository

- `PROJECT_STRUCTURE.md` describes the recommended folder layout and responsibilities for each major package.
- The workspace is currently empty except for the new structure and documentation files.
- Use the root-level `apps/`, `packages/`, `prisma/`, and `docs/` directories to organize frontend, backend, shared logic, database schema, and documentation.

## Development priorities

1. Build the core MVP data model and auth flows.
2. Implement manuscript upload, parsing, and analysis pipelines.
3. Add metadata management, publishing readiness scoring, and export generation.
4. Add AI metadata tools with user-owned API key support.

## Notes for collaborating agents

- Preserve the clean, modular architecture when adding new features.
- Keep backend processing separate from frontend UI concerns.
- Prefer shared packages for reusable validation, types, and business logic.
- Use this file to quickly onboard new agents on the repo structure and goals.
