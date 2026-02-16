# Critique of REBUILD.md

## Overview

REBUILD.md is a solid _architectural vision_ that outlines a compelling transition from vanilla JavaScript to a production-grade React/TypeScript system. However, it reads more like a feature list than an executable plan. The following critique identifies specific flaws, gaps, and recommendations for improvement.

---

## Flaws & Gaps

### 1. No Data Migration Plan

The doc mentions migrating JSON blobs to Firestore but provides zero detail:

- How do you transform the existing RTDB quiz structure?
- Will there be a one-time migration script?
- What happens to existing game history?
- How do you handle the schema differences between Editor (`type: 'multiple'|'short'|'round-title'`) and Host (`type: 'question'|'round-title'` + `questionType: 'MC'|'SHORT'`) during migration?

### 2. Deployment Strategy Missing

You have 3 React apps + Cloud Functions. Where do they deploy?

- Firebase Hosting supports multiple sites, but how does Turborepo handle this?
- How do you manage different entry points (`host`, `player`, `editor`)?
- How do you map apps to Firebase Hosting sites (`<project>.web.app`, `<project>.host.web.app`, etc.)?

### 3. Authentication is Oversimplified

"Firebase Auth" is mentioned but not _how_ the React apps share auth state:

- Currently, `host.html` uses non-anonymous auth while players are anonymous.
- How do you handle this in a shared `packages/ui` or app structure?
- Will there be a shared auth context, or will each app manage its own Firebase auth instance?

### 4. PWA Strategy is Hand-wavy

"Just keep `@vite-pwa/plugin`" ignores real complexities:

- You now have 3 apps. Do they share one service worker?
- Are they separate PWAs with separate manifests?
- The current `sw.js` is already minimal/incomplete per REVIEW.md - this needs addressing.

### 5. No Cost Analysis

Server-authoritative game loop = Cloud Functions running on:

- Every timer tick
- Every answer submission
- Every game state update

This could get expensive fast. The doc should:

- Address this trade-off explicitly
- Propose a "client-honest" fallback mode for cost-sensitive deployments
- Estimate expected Firebase Function invocations per game

### 6. Sync Complexity Ignored

Hybrid Firestore (persistent) + RTDB (ephemeral) sounds good but introduces real complexity:

- What happens when a quiz is edited mid-game?
- How do you ensure players see consistent data?
- How do you handle the "eventual consistency" window when data moves between Firestore and RTDB?

---

## Things Left Out

### Testing Strategy

- How do you test Cloud Functions?
- How do you share Zod schema tests between frontend and backend?
- How do E2E tests change with 3 separate React apps?

### CI/CD Pipeline

- How does GitHub Actions handle the monorepo?
- Do you run lint/typecheck per-workspace or globally?
- How do you deploy? Separate workflows per app?

### Environment Variable Management

- How do you manage Firebase config across apps?
- How do local development, staging, and production differ?

### Error Handling Strategy

- The current codebase has gaps here per REVIEW.md.
- The rebuild should address this systematically.
- How do you handle Cloud Function failures? Timeouts?

### The AI Helper Feature

- Currently host-only, uses client-side API keys stored in `localStorage`.
- How does this work in a server-authoritative architecture?
- Do you proxy through Cloud Functions? If so, how do you manage the API key?

---

## Things to Add

### 1. Migration Runbook

A concrete step-by-step for migrating existing data and users:

1. Export existing RTDB data to JSON
2. Transform to Firestore document structure
3. Upload to Firestore
4. Verify integrity
5. Switch clients over (feature flag or gradual rollout)

### 2. Deployment Architecture Diagram

Show how the 3 apps + functions connect to Firebase projects:

```
┌─────────────┐     ┌─────────────┐
│  apps/host  │     │ apps/player │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ▼
        ┌────────────────┐
        │ Firebase Hosting│
        └────────┬───────┘
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌──────────┐
│ Firestore│ │  RTDB   │ │ Functions│
│(Quizzes) │ │(Game)   │ │(Game Loop│
└─────────┘ └─────────┘ └──────────┘
```

### 3. Bundle Size Budgets

With 3 React apps, track size per app to avoid bloat:

- Host: ~150KB (acceptable - desktop)
- Player: ~100KB max (mobile-first)
- Editor: ~200KB max (rich features)

### 4. Shared Auth Layer

Specify how `packages/auth` or similar handles the host-vs-player auth difference:

```typescript
// Example: packages/auth/src/index.ts
export const useAuth = () => {
    // Host: google.com (non-anonymous)
    // Player: anonymous
};
```

### 5. Offline/Reconnection Strategy

TanStack Query helps, but you need explicit handling for game state:

- What happens when a player loses connection mid-game?
- Do they rejoin automatically?
- How do you handle "stale" game state on reconnect?

### 6. Gradual Migration Path

Consider keeping the vanilla apps alongside the new ones initially:

- Use feature flags to enable/disable new behavior
- Run both systems in parallel during transition
- Decommission old apps only after full validation

---

## Verdict

REBUILD.md is an excellent high-level vision document that captures the key motivations (type safety, server-authoritative logic, monorepo sharing). However, it lacks the **tactical detail** needed to execute. Specifically, it would benefit from:

1. A **Phase 1 / Phase 2** breakdown:
    - Phase 1: Set up monorepo, shared Zod schemas, basic React apps
    - Phase 2: Server-authoritative game loop
    - Phase 3: Migration and cutover

2. **Concrete code examples** for the tricky parts (auth, data sync, deployment)

3. **Risk assessment** for the hybrid Firestore/RTDB strategy

With these additions, REBUILD.md would transition from a "dream" document to an actionable roadmap.
