# Trivia Hosting: Dream Rebuild Instructions

To trigger a complete architectural overhaul (the "Dream Rebuild") of this project, provide the following prompt to the Gemini CLI. This will initiate a **New Application** workflow in a separate directory to maintain your current codebase while building the modernized version.

## The Trigger Prompt

> "I want to start the Dream Rebuild. Please create a new directory named `trivia-v2` at the same level as the current repository. Let's create a plan to build a server-authoritative version of this app using React, TypeScript, and Vite. Please propose a high-level plan for the new architecture and the first steps we should take."

## Why the Dream Rebuild?

The goal of this rebuild is to transition from a "no-build" vanilla JavaScript architecture to a production-grade system with:

- **TypeScript:** For strict type safety and better developer ergonomics.
- **Component-Driven UI:** Using React or Vue for a modular, maintainable frontend.
- **Server-Authoritative Game Loop:** Moving game logic (timers, scoring) to Firebase Cloud Functions or a Node.js backend to prevent "Host dependency" and increase security.
- **XState/State Machines:** To manage complex game states (waiting, countdown, active, revealed) deterministically.
- **Monorepo Structure:** To share TypeScript interfaces between the Host and Player clients.
