# Trivia Hosting Project Roadmap 🚀

This file tracks planned features, UI improvements, and technical debt.

## Tech Debt

- [x] **Update Docs**: With the addition of linting, we should update the current documentation in the appropriate files. Review docs in docs/

## 🎨 Visual Polish & UX

- [x] **Slide Transitions**: Add CSS animations (fade/slide) when changing questions or rounds in Host and Player views.
- [ ] **Sound Effects**:
    - [ ] Timer tick-tock sounds.
    - [ ] Correct answer "ding" / Incorrect answer buzzer.
    - [ ] Low-stakes background music during question time.
- [ ] **Confetti**: Trigger a confetti explosion for the top 3 winners at the end of the game.

## 🛠️ Advanced Mechanics

- [ ] **Power-ups**:
    - [ ] **50/50**: Removes two wrong options (once per game).
    - [ ] **Double Points**: Double the score for the next correct answer.
- [ ] **Teams Mode**: Allow players to join or be assigned to teams for collective scoring.
- [ ] **New Question Types**:
    - [ ] **Ordering**: Drag and drop items into the correct sequence.
    - [ ] **Matching**: Match pairs of related items.
    - [x] **True/False**
    - [x] **Identify**: Identify something e.g. a picture
    - [ ] **Music Clip**: Use a music clip to pose a question
    - [ ] **Estimation**: A number question whereby players provide an estimate, which is scored on proximity to correct answer
    - [ ] **Rebus**: a series of pictures that lead to an answer (e.g. answer is Burning Down The House, question is a pic of a fire, a pic of a down arrow, a pic of a house)
    - [ ] **Video Clip**: Use a video clip to pose a question
- [ ] **Live Reaction Emojis**: Let players send temporary emojis that float up on the host screen.

## 🏗️ Infrastructure & Maintenance

- [x] **Automated Rule Deployment**: Set up GitHub Action to deploy `database.rules.json` to Firebase on every push to main where it has changed.
- [x] **Cleanup**: Remove the local `quizzes/` directory and the quiz import capability from the editor, transitioning fully to Firebase-hosted data.
- [ ] **Image Optimization**: Automatically resize/compress images uploaded to Firebase Storage.
- [ ] **Push Notifications**: Notify players when a game they previously joined is starting.
- [ ] **Analytics Dashboard**: Create a simple internal view to visualize question difficulty and player engagement over time.

## 📝 Editor Improvements

- [x] **Drag-and-Drop Reordering**: Allow the host to drag slides in the left-hand sidebar to easily change the question order.
- [x] **Fix Flaky Drag-and-Drop**: The current SortableJS implementation is flaky; improve stability and ensure reliable reordering.
- [x] **Autosave**: Save changes to the current quiz draft automatically after every edit.
- [x] **AI-Powered Options**: If a multiple choice question has only one option supplied, use Gemini to supply other likely options.
- [x] **Bulk Question import**: Ability to import questions (just questions, not quizzes) from CSV or JSON files into the global pool.
- [x] **Pagination**: Implement paging for the question bank and browser to handle large datasets.
- [ ] **AI Quiz Generation**: Auto-generate a quiz based on heuristics: nbr of rounds, nbr of questions per round, round categories, expected age range of participants.
- [x] **Editor Settings**: Ability to save editor settings, such as autosave time and UI preferences.

## Data Structure

- [x] **Decoupled questions**: Questions are now entities in a global pool (`questions` node), allowing them to be shared across multiple quizzes.
- [ ] **OpenTDB Integration**: Import and attribute questions from the Open Trivia Database (OpenTDB).
- [ ] **Question Metadata**: Expand metadata for the global pool: category, sub-category, difficulty, and target age range.

## 🧹 Code Health

- [x] **Shared UI Components**: Extract common elements (Timer, Scoreboard row, Option button) into shared files to ensure consistency between Host and Player.
- [x] **Error Boundaries**: Improve handling of Firebase connection drops with auto-reconnect UI.
