# Trivia Hosting: Dream Rebuild Instructions

To trigger a complete architectural overhaul (the "Dream Rebuild") of this project, provide the following prompt to the Gemini CLI. This will initiate a **New Application** workflow in a separate directory to maintain your current codebase while building the modernized version.

## The Trigger Prompt

> "I want to start the Dream Rebuild. Please create a new directory named `trivia-v2` at the same level as the current repository. Let's create a plan to build a server-authoritative version of this app using React, TypeScript, and Vite. Please propose a high-level plan for the new architecture and the first steps we should take."

## Why the Dream Rebuild?

The goal of this rebuild is to transition from a "no-build" vanilla JavaScript architecture to a production-grade system with:

- **TypeScript:** For strict type safety and better developer ergonomics.
- **Component-Driven UI:** Using **React** for a modular, maintainable frontend.
- **Modern Build Stack:** Using **Vite** for blistering fast development and optimized production builds.
- **Server-Authoritative Game Loop:** Moving game logic (timers, scoring) to Firebase Cloud Functions or a Node.js backend to prevent "Host dependency" and increase security.
- **XState/State Machines:** To manage complex game states (waiting, countdown, active, revealed) deterministically.
- **Monorepo Structure:** To share TypeScript interfaces between the Host and Player clients.

## Frontend & Build Stack

The rebuild will utilise a modern, type-safe stack designed for performance and developer productivity.

### 1. Vite (Build Tool)
Vite is chosen for its lightning-fast Hot Module Replacement (HMR) and native ES Module support during development.
- **Template:** `react-ts` (React + TypeScript).
- **Path Aliases:** Use `@/` mapped to the `src` directory for clean imports (configured via `vite-tsconfig-paths`).
- **Environment Variables:** All Firebase secrets must be prefixed with `VITE_` and accessed via `import.meta.env`.

### 2. React (UI Library)
Moving away from Alpine.js to React allows for a truly component-driven architecture.
- **Hooks:** Custom hooks for Firebase synchronisation and game state management.
- **Styling:** CSS Modules or Tailwind CSS for scoped, maintainable styles.

### 3. PWA & Assets
- **Vite Plugin PWA:** Automates the generation of service workers and manifest files, ensuring a robust offline-capable experience.
- **Asset Optimization:** Vite handles automatic image compression and bundling.

## Data Storage Strategy

For a server-authoritative model, we recommend a hybrid storage approach:

- **Cloud Firestore (Primary):** Use for all persistent data including the Question Bank, Quizzes, User Profiles, and Game History. Its document-based structure maps perfectly to TypeScript interfaces.
- **Realtime Database (Ephemeral):** Use strictly for the "Live Session" state (timers, active player counts, current slide). Its sub-millisecond latency ensures a responsive feel for players.
- **Alternative (Supabase):** A strong contender if a relational (PostgreSQL) structure is preferred, offering built-in real-time subscriptions and auto-generated types.

## Estimated Costs

The modernized architecture is designed to stay within the **Firebase Spark (Free) Plan** for most hobby and small-event use cases.

| Component           | Free Tier (Spark)          | Blaze Plan (Pay-as-you-go) |
| :------------------ | :------------------------- | :------------------------- |
| **Firestore**       | 1GB storage, 50k reads/day | ~$0.06 per 100k reads      |
| **RTDB**            | 10GB downloaded/month      | $1.00 per GB downloaded    |
| **Cloud Functions** | 2M invocations/month       | ~$0.0000004 per invocation |
| **Hosting**         | 10GB storage               | Minimal storage fees       |

_Note: Cloud Functions require the Blaze plan (credit card on file), but you still benefit from the free usage tiers mentioned above._
