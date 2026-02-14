# PEDANTIC CODE REVIEW: Trivia Hosting System
**Date:** Saturday, February 14, 2026
**Auditor:** Pedantic & Antagonistic Devil's Advocate

---

## 1. The "No-Build" Delusion
The project prides itself on a "no-build" architecture. This is not a feature; it is an avoidance of modern engineering standards.
- **Question:** How do you justify the lack of tree-shaking and minification in 2026? Every player is downloading redundant comments and whitespace because you've prioritised "simplicity" over user bandwidth and performance.
- **The Debt:** By avoiding a build step, you've crippled your ability to use TypeScript properly, forcing you to rely on fragile JSDoc comments that the runtime completely ignores.

---

## 2. Inconsistent Schema & "Normalization" Debt
`shared/quiz-parser.js` is a patchwork of "if" statements attempting to reconcile the conflicting needs of the Editor and the Host.
- **The Fragility:** `toFlatSlides` performs complex re-mapping of data every time a quiz is loaded. Why is the data not stored in the target schema to begin with? 
- **The Biting Question:** Why does the `difficulty` mapping logic exist in three different places (`host-data.js`, `editor-data.js`, and `quiz-parser.js`)? If you decide to add an 'Expert' difficulty, you have to remember to update three separate files. This is technical debt by design.

---

## 3. The Myth of Locale-Awareness
`shared/ui-components.js` claims to use system locale for dates: `new Date(timestamp).toLocaleDateString(undefined, ...)`.
- **The Hidden Debt:** You pass `undefined` as the locale, which defaults to the browser's current settings. However, the rest of the application (like answer normalization) is hardcoded for English ASCII characters.
- **The Contradiction:** You're pretending to be locale-aware in the UI while being locale-blind in the core logic. What happens when a user with a non-Gregorian calendar or a right-to-left locale tries to use this "flexible" component?

---

## 4. Fragile String Manipulation
`TriviaDataService.normalizeString` uses a regex: `/^[A-Fa-f0-9][).]\s*/`.
- **The Logic Gap:** This regex assumes that any string starting with a hex character followed by a parenthesis is a "legacy prefix." What if the answer to a question is "B.B. King" or "4.5 Litres"? Your "normalization" will strip the start of the actual data.
- **The Assumption:** You've assumed that all trivia data follows a specific, narrow historical format without considering the collision with legitimate data.

---

## 5. Leaky Security and Data Integrity
The "Security" in `database.rules.json` relies on checking `auth.token.firebase.sign_in_provider != 'anonymous'`.
- **The Technical Debt:** This assumes that "anonymous" is the only untrusted provider. If a malicious actor creates a legitimate Google account (which is trivial), they have full administrative write access to your global question bank. 
- **The Biting Question:** Why is there no validation on the *structure* of the questions beyond "it has a title"? A user could push a 10MB string into a `question` field and effectively DOS the database for every other user.

---

## 6. Verdict
This codebase is a collection of "clever" workarounds for problems that were solved a decade ago by standard tooling. It is a "happy path" implementation that will crumble the moment it encounters data that hasn't been hand-cleaned by the developers. It's not "lightweight"; it's incomplete.
