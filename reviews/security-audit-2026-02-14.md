# SECURITY AUDITOR REPORT: Trivia Hosting System
**Date:** Saturday, February 14, 2026
**Auditors:** Hostile Security Auditor / Cynical Lead Developer

---

## 1. Executive Summary: "A House of Cards"
The system architecture is a textbook example of "Optimistic Engineering." It assumes all actors are honest and that client-side state is immutable by third parties. By delegating critical business logic (scoring, game progression, state management) to a single "Host" browser, the system is one "Inspect Element" away from total collapse.

---

## 2. Architectural Liabilities

### 2.1. Client-Side Scoring (CRITICAL FAILURE)
The most egregious flaw is that scoring logic resides entirely in `host-data.js`.
- **The Gap:** The "Host" browser calculates points and writes them directly to `players/$uid/score`.
- **The Risk:** If the Host's browser crashes, loses connection mid-loop, or is compromised, the integrity of the entire game is lost.
- **The Cynic's View:** "We're trusting a browser to be a database transaction manager. It's not atomic, it's not reliable, and it's certainly not secure."

### 2.2. The "Host" Authentication Myth
Security rules distinguish between anonymous (Player) and non-anonymous (Host) providers.
- **The Gap:** There is no allow-list for Host UIDs. Any user who authenticates via a non-anonymous provider (Google, Email/Password, etc.) inherits full write access to the `gameState`, `quizzes`, and `questions` nodes.
- **The Risk:** A malicious player could simply use a non-anonymous login method to gain administrative control over the session.

### 2.3. Global Namespace Pollution
The project relies on `window.TriviaFirebase`, `window.TriviaDataService`, and `window.createHostData`.
- **The Gap:** No modularity. Everything is attached to the global `window` object.
- **The Risk:** Collision with third-party scripts or even browser extensions. Debugging "Who changed the data service?" becomes a nightmare in a production environment.

---

## 3. Logic Gaps & Edge Cases

### 3.1. Non-Atomic State Synchronization
`syncGameState` in `host-data.js` uses a `setTimeout` (50ms) to throttle updates.
- **The Gap:** If multiple state changes occur rapidly, the "last one wins," but intermediate states may be lost or inconsistent if the network is jittery.
- **The Risk:** UI flickering on the player side or, worse, players seeing the answer before the timer technically ends due to race conditions in the `answerRevealed` flag.

### 3.2. Regex-Based Normalization
`TriviaDataService.normalizeForComparison` uses aggressive regex: `.replace(/[^\w\s]|_/g, '')`.
- **The Gap:** This destroys non-Latin characters. A trivia question about "Café" vs "Cafe" or any non-English language will fail or behave unpredictably.
- **The Risk:** Limited internationalization and brittle answer matching.

### 3.3. Question Pool Vulnerability
All questions are stored in a global `questions` node.
- **The Gap:** Any "Host" can modify ANY question, even those they didn't create.
- **The Risk:** Mass deletion or corruption of the question bank by a single rogue or compromised host account.

---

## 4. Dependency Review
- **Firebase (Compat):** Using legacy compat scripts in 2026 is technical debt by choice. It's heavier and less efficient than the modular SDK.
- **SortableJS & SweetAlert2:** Heavy dependencies for simple tasks. A custom drag-drop and a simple modal component would reduce the attack surface and bundle size.
- **Alpine.js:** While lightweight, the "no-build" policy means we're pulling this from a CDN or local script without tree-shaking, leading to bloated client-side execution.

---

## 5. Auditor's Verdict
**Status: FAIL.**
The system is suitable for a low-stakes living room trivia night, but it is architecturally unfit for any competitive or public-facing environment. The "Host" is too powerful, the "Rules" are too permissive, and the "Logic" is too distributed.

**Recommended Remediation:**
1. Move scoring and state transitions to **Firebase Cloud Functions**.
2. Implement **RBAC (Role-Based Access Control)** using Custom Claims for Hosts.
3. Abandon the "no-build" global script approach for a **modular ES architecture**.
4. Harden the Security Rules to enforce **ownership** of quizzes and questions.
