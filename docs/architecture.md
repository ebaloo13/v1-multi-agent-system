# Modular AI Operations Architecture

This note defines the intended homes for future platform modules. It is only a structure guide; existing logic has not been moved.

- `src/core`: shared business objects and services used across domains.
- `src/agents`: domain coordinators and specialist agents.
- `src/workflows`: orchestrated business processes that combine agents, core services, and integrations.
- `src/integrations`: adapters for external systems.
- `src/runtime`: execution utilities for running and coordinating platform work.
- `src/storage`: local and database persistence adapters.
- `src/shared`: cross-cutting helpers that are not domain-specific.
