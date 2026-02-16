# Trivia Hosting: Dream Rebuild Instructions

To trigger a complete architectural overhaul (the "Dream Rebuild") of this project, provide the following prompt to the Gemini CLI. This will initiate a **New Application** workflow in a separate directory to maintain your current codebase while building the modernized version.

## The Trigger Prompt

> "I want to start the Dream Rebuild. Please create a new directory named `trivia-v2` at the same level as the current repository. Let's create a plan to build a server-authoritative, monorepo-based version of this app using React, TypeScript, and Vite. Please propose a high-level plan for the new architecture using Turborepo, Zod for shared schemas, and a hybrid Firestore/RTDB data strategy."

## Why the Dream Rebuild?

The goal of this rebuild is to transition from a "no-build" vanilla JavaScript architecture to a production-grade system. The current codebase has grown significantly in complexity (Question Bank, Rebus, Rich Text, complex validation), and the lack of type safety and component isolation is becoming a bottleneck.

**Core Goals:**
- **Strict Type Safety:** End-to-end TypeScript coverage from Database to UI.
- **Server-Authoritative Game Loop:** Moving critical logic (timers, scoring, answer validation) to **Cloud Functions** to prevent cheating and client desync.
- **Monorepo Structure:** To share schemas (`packages/schema`) and UI components (`packages/ui`) between the Host, Player, and Editor apps.
- **Scalable Data Model:** Moving persistent data (Quizzes, Question Bank) to **Firestore** while keeping the live game loop on **Realtime Database** for sub-millisecond latency.

## Architecture: The Monorepo

We will use **Turborepo** to manage the following workspaces:

| Workspace | Type | Purpose |
| :--- | :--- | :--- |
| `apps/host` | React (Vite) | The Dashboard and Game Control Panel. Focused on high-density information and management. |
| `apps/player` | React (Vite) | Mobile-first PWA for players. Focused on performance, battery life, and offline resilience. |
| `apps/editor` | React (Vite) | Desktop-class content creation tool. Heavily relies on forms, drag-and-drop, and rich text. |
| `packages/schema` | Library | **Zod** schemas for all data models (Quiz, Question, GameState). Shared between frontend and backend. |
| `packages/ui` | Library | Shared React components (Buttons, Cards, Timers) built with **Tailwind CSS**. |
| `functions` | Backend | Firebase Cloud Functions for the authoritative game loop. |

## Comprehensive Tech Stack

The following libraries are selected to replace the current vanilla/Alpine.js implementations:

| Feature | Current Implementation | Rebuild Choice | The "Why" |
| :--- | :--- | :--- | :--- |
| **Build Tool** | None (Vanilla JS) | **Vite** | Blistering fast HMR and optimized production builds. |
| **Language** | JavaScript (JSDoc) | **TypeScript** | Catch errors at compile time; strict interfaces for API/DB data. |
| **UI Library** | Alpine.js + HTML strings | **React** | Component-driven, declarative UI. |
| **Styling** | CSS Variables + Utility Classes | **Tailwind CSS** | Standardised, collocated styling with zero runtime cost. |
| **State (Client)** | Alpine `x-data` | **Zustand** | Minimalist global state without provider hell. |
| **State (Server)** | Manual Firebase Listeners | **TanStack Query** | Caching, deduplication, and loading states for Firestore/RTDB. |
| **Forms** | Manual DOM manipulation | **React Hook Form** | Performant, uncontrolled inputs (crucial for the Editor). |
| **Validation** | Manual checks | **Zod** | Schema-first validation that infers TypeScript types. |
| **Rich Text** | Pell | **TipTap** | Headless, accessible, and fully customizable for the "compact" editor requirements. |
| **Drag & Drop** | SortableJS | **dnd-kit** | Accessible, React-native drag-and-drop for slides and Rebus images. |

## Data Storage Strategy

We will move to a **Hybrid Strategy** to balance cost, query power, and latency.

### 1. Cloud Firestore (Persistence)
*Used for: Question Bank, Quiz Library, User Profiles, Game History.*
- **Why?** Relational queries (filtering Question Bank by tags/type), pagination, and structured documents.
- **Migration:** Existing JSON blobs in RTDB will be migrated to individual Firestore documents.

### 2. Realtime Database (Ephemeral)
*Used for: Live Game Sessions.*
- **Why?** Lowest possible latency for synchronizing timer ticks (1s intervals) and player buzz-ins.
- **Structure:** `sessions/{gameId}` containing only transient state (`currentSlide`, `timer`, `playerScores`).

### 3. Cloud Storage
*Used for: Images.*
- **Why?** Store uploaded slide and Rebus images.
- **Optimization:** Use Firebase Extensions to automatically resize/compress images for mobile players.

## Migration & Features to Port

The Rebuild must verify the following complex features are correctly ported:

1.  **Question Bank:** Advanced filtering, pagination, and "Import to Quiz" logic (currently in `editor-data.js`).
2.  **Rich Text Editor:** Must support bold, italic, underline, and links, but remain visually compact (1-2 lines).
3.  **Rebus Support:** Drag-and-drop image reordering and multi-image uploads.
4.  **Tagging System:** Auto-complete, creation, and filtering.
5.  **PWA:** Service Workers for offline resilience (keep `@vite-pwa/plugin`).

## Project Initialisation

```bash
# 1. Initialize Turborepo
npx create-turbo@latest trivia-v2
# Select "npm" as client

# 2. Add dependencies to packages/ui
cd trivia-v2/packages/ui
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. Setup Apps
# (Repeat for host, player, editor)
cd ../../apps/host
npm install firebase react-firebase-hooks zustand @tanstack/react-query date-fns lucide-react
```
