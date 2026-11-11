# ADR-0009: UI components – Ionic Framework

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 4.2

## Context

Angular is the UI framework (ADR-0002). A component library is needed for a mobile look & feel.

## Options

Ionic Framework (`@ionic/angular`), Angular Material, own design.

## Decision

Use **Ionic Framework components first**. Own components only where Ionic has no suitable one.

## Consequences

- Ionic components and theming (incl. dark mode) are used across the app.
- Ionic integrates with Capacitor (same vendor), Angular routing and gestures (e.g. swipe lists).
