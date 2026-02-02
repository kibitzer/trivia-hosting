# Trivia Hosting Project Roadmap 🚀

This file tracks planned features, UI improvements, and technical debt.

## 🎨 Visual Polish & UX
- [ ] **Slide Transitions**: Add CSS animations (fade/slide) when changing questions or rounds in Host and Player views.
- [ ] **Sound Effects**:
    - [ ] Timer tick-tock sounds.
    - [ ] Correct answer "ding" / Incorrect answer buzzer.
    - [ ] Low-stakes background music during question time.
- [ ] **Themes**: Implement preset visual styles (e.g., "Neon Night", "Classic Classroom", "Dark Mode").
- [ ] **Confetti**: Trigger a confetti explosion for the top 3 winners at the end of the game.

## 🛠️ Advanced Mechanics
- [ ] **Power-ups**:
    - [ ] **50/50**: Removes two wrong options (once per game).
    - [ ] **Double Points**: Double the score for the next correct answer.
- [ ] **Teams Mode**: Allow players to join or be assigned to teams for collective scoring.
- [ ] **New Question Types**:
    - [ ] **Ordering**: Drag and drop items into the correct sequence.
    - [ ] **Matching**: Match pairs of related items.
- [ ] **Live Reaction Emojis**: Let players send temporary emojis that float up on the host screen.

## 🏗️ Infrastructure & Maintenance
- [ ] **Automated Rule Deployment**: Set up GitHub Action to deploy `database.rules.json` to Firebase on every push to main.
- [ ] **Image Optimization**: Automatically resize/compress images uploaded to Firebase Storage.
- [ ] **Push Notifications**: Notify players when a game they previously joined is starting.
- [ ] **Analytics Dashboard**: Create a simple internal view to visualize question difficulty and player engagement over time.

## 📝 Editor Improvements
- [x] **Drag-and-Drop Reordering**: Allow the host to drag slides in the left-hand sidebar to easily change the question order.
- [x] **Autosave**: Save changes to the current quiz draft automatically after every edit.

## 🧹 Code Health
- [ ] **Shared UI Components**: Extract common elements (Timer, Scoreboard row, Option button) into shared files to ensure consistency between Host and Player.
- [ ] **Error Boundaries**: Improve handling of Firebase connection drops with auto-reconnect UI.
