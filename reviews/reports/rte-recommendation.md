# Report: Rich Text Editor Recommendation for Trivia Hosting

## Comparison of Suggested Editors

| Editor | Size (Gzipped) | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Pell** | ~1.3 KB | Extremely lightweight, zero dependencies, simple API. | Minimal features, older codebase. |
| **Squire** | ~11.5 KB | More robust formatting, handles complex HTML better. | Slightly larger, more complex configuration. |
| **Trix** | ~80 KB | Very polished, handled by Basecamp, battle-tested. | Heavy, may feel bulky for a minimalist project. |

## Recommendation: Pell

Given the project's core principles of **minimalism** and **no-build architecture**, **Pell** is the most appropriate choice. It provides exactly what is needed (bold, italic, links) without unnecessary bloat.

### Integration Strategy with Alpine.js
We can create a custom `x-data` or `x-init` wrapper for Pell to keep it reactive with our Alpine.js state:

```javascript
// Example implementation
x-init="
    pell.init({
        element: $el,
        onChange: html => { model = html },
        actions: ['bold', 'italic', 'underline', 'link']
    });
    $el.content.innerHTML = model;
"
```

## Proposed Implementation Plan
1. Add Pell to `shared/head-helper.js`.
2. Update `host/editor.html` to replace the `textarea` for:
   - Question Text
   - Verification Source
   - Host Notes
3. Ensure the Host and Player views can safely render the HTML (using `x-html`).
4. Update `shared/quiz-parser.js` if needed to handle HTML content safely.

---
**Would you like me to proceed with Implement Mode for Pell?**
