# Report: Quiz Import & Collision Detection Strategies

## Architectural Impact
Implementing a "Quiz Import" feature requires extending the `Dashboard` to handle file uploads and parsing entire quiz structures (Title + Questions). Since the system now uses a decoupled architecture where questions are top-level entities, an import must decide how to handle the global question pool.

## Proposed Strategies for Collision Detection

Detecting whether a question already exists in the global pool is crucial to avoid "polluting" the database with identical entries.

### 1. Simple Text Hashing (Recommended)
- **Mechanism**: Generate a hash or normalized slug of the question text (e.g., lowercase, alphanumeric only).
- **Pros**: Fast, deterministic, easy to implement.
- **Cons**: Minor changes in punctuation or wording (e.g., "What's" vs "What is") bypass detection.

### 2. Contextual Matching (Intent-based)
- **Mechanism**: Compare both the question text and the correct answer.
- **Pros**: Reduces false negatives (two different questions with same text).
- **Cons**: Still sensitive to wording.

### 3. AI-Assisted De-duplication
- **Mechanism**: Use Gemini/LLM to check if a new question is semantically identical to existing ones.
- **Pros**: High accuracy; handles variations in wording.
- **Cons**: Costs (tokens), latency, requires an existing index to compare against.

### 4. Fuzzy Matching (Levenshtein Distance)
- **Mechanism**: Calculate the "edit distance" between strings. If distance is < 10%, treat as a collision.
- **Pros**: Good balance between simple hashing and AI.
- **Cons**: Computationally expensive as the pool grows ($O(N)$ comparisons).

## Proposed Implementation Plan

1.  **Dashboard Enhancement**: Add an "Import Quiz" button to the Dashboard.
2.  **Parser Update**: Enhance `shared/quiz-parser.js` to handle both full quiz JSON/CSV and question-only lists.
3.  **Import Logic**:
    -   Parse the file.
    -   For each question:
        -   Normalize text.
        -   Check if a question with the same text/answer exists in the global pool.
        -   If it exists, link the quiz to the existing question ID.
        -   If it doesn't exist, create a new top-level question and link it.
4.  **UI Feedback**: Show a summary of how many *new* questions were created vs how many *existing* questions were reused.

## Recommendation
I recommend starting with **Contextual Matching (Strategy 2)** combined with a **Normalized Slug** check. This is cost-effective, fast, and covers 90% of common duplication cases in trivia datasets.

---
**Would you like me to proceed to Implement Mode based on the recommended strategy?**
