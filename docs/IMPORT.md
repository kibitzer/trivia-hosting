# Import Formats

The Trivia Hosting system allows you to bulk-import content into the global **Question Bank** or create full **Quizzes** with titles and structure using JSON or CSV formats.

## 1. Question Import (Question Bank)

When importing into the Question Bank, the system focuses on individual questions.

### Supported Fields

| Field | Description | Default |
|-------|-------------|---------|
| `question` | The main question text (alias: `text`) | Required |
| `type` | `multiple`, `MC`, `true-false`, `short`, or `identify` | `short` |
| `options` | Array of strings (for Multiple Choice) | `[]` |
| `correctAnswer` | The correct answer string or array of variations (alias: `answer`) | Required |
| `timer` | Number of seconds for the countdown | `20` |
| `difficulty` | `Easy`, `Medium`, or `Hard` | `Medium` |
| `tags` | Array of strings for categorization (alias: `category`) | `[]` |
| `notes` | Private notes visible only to the host | `""` |
| `factCheckingRequired`| Boolean to flag for verification | `false` |
| `factCheckingSource` | URL or description of the source | `""` |

### JSON Format
The importer accepts a JSON array of objects or a single object containing a `questions` array.

```json
[
  {
    "question": "Which planet is known as the Red Planet?",
    "type": "multiple",
    "options": ["Venus", "Mars", "Jupiter", "Saturn"],
    "correctAnswer": "Mars",
    "difficulty": "Easy",
    "tags": ["Science", "Space"]
  },
  {
    "question": "Who painted the Mona Lisa?",
    "type": "short",
    "correctAnswer": "Leonardo da Vinci",
    "tags": ["Art", "History"]
  }
]
```

### CSV Format
`Question, Type, Options, CorrectAnswer`

- **Type**: Use `MC` for Multiple Choice, or `SHORT` for Short Answer.
- **Options**: Use a pipe `|` to separate multiple choice options.
- **CorrectAnswer**: The exact text for the answer.

```csv
What is the capital of Japan?, MC, Kyoto|Osaka|Tokyo|Nagoya, Tokyo
What is the chemical symbol for Gold?, SHORT, , Au
```

---

## 2. Quiz Import (Full Structure)

A Quiz import allows you to define a title and a sequence of slides, including **Round Titles** to structure the game.

### JSON Format
The importer accepts an object with `title` and `questions` fields.

```json
{
  "title": "Friday Night Trivia",
  "questions": [
    {
      "type": "round-title",
      "title": "Round 1: Geography",
      "timer": 15
    },
    {
      "question": "What is the largest continent?",
      "type": "short",
      "correctAnswer": "Asia",
      "tags": ["Geography"]
    }
  ]
}
```

### CSV Format
You can specify the quiz title on the first line using a `#` prefix.

```csv
# Friday Night Trivia
Round 1: Geography, ROUND-TITLE
What is the largest continent?, SHORT, , Asia
```

### Round Titles
Round titles are special slides that display a transition or introduction. They support the following fields in JSON:

| Field | Description | Default |
|-------|-------------|---------|
| `type` | Must be `round-title` | Required |
| `title` | The text to display on the slide | Required |
| `timer` | Seconds to display the title | `20` |
| `image` | URL or Base64 string for a background image | `null` |

> **Note**: If your content contains commas, we recommend using the **JSON** format to avoid parsing errors.

