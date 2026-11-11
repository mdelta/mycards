# ADR-0002: UI framework – Angular

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 4.2

## Context

Capacitor is framework-agnostic (ADR-0001). A UI framework has to be chosen.

## Decision

Use **Angular** (current stable version at project start).

## Consequences

- Angular CLI is used for building, testing and linting the web part.
- Domain logic is kept in plain TypeScript services/classes without Angular dependencies where
  feasible, so it stays unit-testable (arc42 section 5).
- Open: UI component library (Ionic Framework, Angular Material, own design) – arc42 Q-4.
