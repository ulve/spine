# Spine Schema Specification

This document describes the JSON data format produced by the book analysis pipeline. Each processed book is stored as a single JSON file. A registry file (`books.json`) indexes all processed books.

---

## File layout

| File | Description |
|---|---|
| `<Title> - <Author>.json` | One file per book, named from title and author |
| `books.json` | Registry: a dict keyed by `book_id`, each value is a full book object |

The per-book files and the registry entries have identical schemas.

---

## Book object

```json
{
  "book_id":          "<string>",
  "title":            "<string>",
  "author":           "<string>",
  "processed_at":     "<ISO 8601 timestamp>",
  "chapter_summaries": [ /* ChapterSummary[] */ ],
  "plot_summary":     "<string>",
  "characters":       [ /* Character[] */ ],
  "themes":           [ /* string[] */ ],
  "topics":           [ /* string[] */ ],
  "relationships":    [ /* Relationship[] */ ],
  "mysteries":        [ /* Mystery[] */ ],
  "world":            [ /* WorldLocation[] */ ]
}
```

| Field | Type | Description |
|---|---|---|
| `book_id` | string | SHA-256 hex digest of the source epub file. Stable identifier across re-runs. |
| `title` | string | Book title extracted from epub metadata. |
| `author` | string | Author name extracted from epub metadata. |
| `processed_at` | string | ISO 8601 timestamp (UTC) of when the analysis was last written. |
| `chapter_summaries` | ChapterSummary[] | Per-chapter analysis, ordered by chapter number. |
| `plot_summary` | string | Cohesive 3–5 paragraph narrative summary of the full book. |
| `characters` | Character[] | Deduplicated character guide covering the whole book. |
| `themes` | string[] | Abstract thematic ideas present in the book (e.g. `"Identity"`, `"Corporate Control"`). |
| `topics` | string[] | Concrete subjects the book deals with (e.g. `"Advanced Robotics"`, `"Clan Politics"`). |
| `relationships` | Relationship[] | Key character relationships and how they evolve. |
| `mysteries` | Mystery[] | Unresolved questions and plot hooks, with resolution status. |
| `world` | WorldLocation[] | Significant locations, grouped and described. |

---

## ChapterSummary

```json
{
  "chapter":   1,
  "title":     "Chapter One",
  "summary":   "<1–2 paragraph prose summary>",
  "pov":       "<character name or 'omniscient'>",
  "locations": ["Location A", "Location B"],
  "role":      "Setup"
}
```

| Field | Type | Description |
|---|---|---|
| `chapter` | integer | Chapter number as it appears in the book. Not guaranteed to be sequential or start at 1 — gaps and duplicates can occur in books with non-standard numbering (interludes, prologues, etc.). |
| `title` | string | Chapter title as extracted from the epub. May include a prefix like `"CHAPTER 5: The Horn's Kitten"` or be bare. |
| `summary` | string | 1–2 paragraph prose summary covering the main events, POV, locations, and narrative purpose. |
| `pov` | string | The character from whose perspective the chapter is narrated, or `"omniscient"` if there is no single POV. Free text — treat as display label only. |
| `locations` | string[] | Named locations where the chapter takes place, in order of appearance. |
| `role` | string | The chapter's narrative function. See [Chapter roles](#chapter-roles) below. |

### Chapter roles

The `role` field is a free-text label describing the chapter's narrative function. It may be a single token or multiple tokens joined by `|` or `/`. Canonical tokens are:

| Token | Meaning |
|---|---|
| `Setup` | Establishes situation, characters, or stakes |
| `Transition` | Moves characters or plot between states |
| `Revelation` | Discloses information that recontextualises earlier events |
| `Climax` | Peak of tension or conflict |
| `Action` | Primarily action or confrontation-driven |
| `Backstory` | Expands on past events or character history |
| `Escalation` | Raises the stakes without resolving anything |
| `Inciting Incident` | The event that sets the main conflict in motion |

Examples: `"Setup"`, `"Setup|Transition"`, `"Action|Climax|Revelation"`, `"Revelation/Setup"`.

Viewers should treat the field as a display string and may optionally split on `|` or `/` to render multiple tags.

---

## Character

```json
{
  "name":        "Dr. Mensah",
  "description": "<prose description of the character>",
  "role":        "supporting",
  "arc":         "<prose description of the character's arc>",
  "chapters":    [1, 2, 3, 4, 5]
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Character's canonical name. Variants and aliases are merged into this single entry. |
| `description` | string | Prose description of the character's personality, capabilities, and function in the story. |
| `role` | string (enum) | Exactly one of: `protagonist`, `antagonist`, `supporting`, `minor`. Always lowercase. |
| `arc` | string | Prose description of how the character changes or what journey they undergo across the book. |
| `chapters` | integer[] | Chapter numbers in which this character appears. Corresponds to `ChapterSummary.chapter` values. |

---

## Relationship

```json
{
  "characters": ["Name A", "Name B"],
  "type":       "Comrade/Partner",
  "dynamic":    "<prose description of the relationship dynamic>",
  "evolution":  "<prose description of how the relationship changes>"
}
```

| Field | Type | Description |
|---|---|---|
| `characters` | string[] | Exactly two character names involved in this relationship. Always strings — never nested objects. |
| `type` | string | Short label for the relationship type (e.g. `"Mentor/Protégé"`, `"Antagonistic/Rivalry"`, `"Romantic/Best Friends"`). Free text. |
| `dynamic` | string | Prose description of the nature and quality of the relationship at its core. |
| `evolution` | string | Prose description of how the relationship changes across the story. |

---

## Mystery

```json
{
  "question":           "Who installed the combat override modules and why?",
  "introduced_chapter": 4,
  "status":             "open",
  "resolution":         null
}
```

| Field | Type | Description |
|---|---|---|
| `question` | string | The unresolved question or plot hook, phrased as a question. |
| `introduced_chapter` | integer | The chapter number where this question first arises. |
| `status` | string (enum) | One of: `open`, `resolved`, `partial`. |
| `resolution` | string \| null | Explanation of the resolution if `status` is `resolved` or `partial`. `null` if `open`. |

---

## WorldLocation

```json
{
  "name":        "Transit Ring",
  "description": "<prose description of the place and its significance>",
  "chapters":    [4, 6, 9]
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Location name. |
| `description` | string | Brief prose description of the place and its role in the story. |
| `chapters` | integer[] | Chapter numbers where this location appears. |

---

## books.json registry

The registry file is a flat dict keyed by `book_id`:

```json
{
  "<book_id>": { /* full Book object */ },
  "<book_id>": { /* full Book object */ }
}
```

Not all books in the per-file store are guaranteed to appear in the registry — treat it as a cache/index and fall back to scanning individual files if needed.

---

## Notes for implementors

- **`chapter` is not a reliable sequence index.** Some books have non-sequential chapter numbering, gaps, or duplicate chapter numbers (interludes, named parts, etc.). Do not assume chapters form a contiguous range or start at 1. Sort by the `chapter` integer for display order, but use array index as the stable key for referencing.
- **`characters` in Relationship is always strings.** Never objects or nested arrays.
- **`characters` at the book level is a flat array.** Not wrapped in an envelope object.
- **`themes` vs `topics`:** Themes are abstract (e.g. `"Identity"`, `"Autonomy"`). Topics are concrete (e.g. `"Advanced AI and Robotics"`, `"Off-World Colonization"`). Both are simple string arrays.
- **`processed_at`** reflects the last write, not the first analysis. A book re-processed for a single mode will have its timestamp updated even if most fields are unchanged.
- **`tags`** may be present on some book objects as a `string[]` if the tagging pipeline has been run. It is not present by default and should be treated as optional.
