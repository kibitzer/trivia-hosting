# Question Import Formats

The Trivia Hosting system allows you to bulk-import questions into the global **Question Bank** using either JSON or CSV formats.

## 1. JSON Format

The importer accepts a JSON array of objects or a single object containing a `questions` array.

### Supported Fields

| Field | Description | Default |
|-------|-------------|---------|
| `question` | The main question text (alias: `text`) | Required |
| `type` | `multiple`, `MC`, `true-false` or `short` | `short` |
| `options` | Array of strings (for Multiple Choice) | `[]` |
| `correctAnswer` | The correct answer string or array of variations (alias: `answer`) | Required |
| `timer` | Number of seconds for the countdown | `20` |
| `difficulty` | `Easy`, `Medium`, or `Hard` | `Medium` |
| `tags` | Array of strings for categorization (alias: `category`) | `[]` |
| `notes` | Private notes visible only to the host | `""` |
| `factCheckingRequired`| Boolean to flag for verification | `false` |
| `factCheckingSource` | URL or description of the source | `""` |

### Example JSON
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
    "tags": ["Art", "History"],
    "notes": "Accept just 'Leonardo' if you are feeling generous."
  }
]
```

## 2. CSV Format

For quick imports, you can use a simple comma-separated format. Each question should be on a new line.

### Format
`Question, Type, Options, CorrectAnswer`

- **Type**: Use `MC` for Multiple Choice, or `SHORT` (or anything else) for Short Answer.
- **Options**: Use a pipe `|` to separate multiple choice options.
- **CorrectAnswer**: The exact text for the answer.

### Example CSV
```csv
What is the capital of Japan?, MC, Kyoto|Osaka|Tokyo|Nagoya, Tokyo
How many legs does a spider have?, MC, 6|8|10|12, 8
What is the chemical symbol for Gold?, SHORT, , Au
```

> **Note**: If your question or options contain commas, we recommend using the **JSON** format to avoid parsing errors.
