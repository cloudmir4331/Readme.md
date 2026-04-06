# Voice Notes → Daily Prioritized To‑Do + Google Calendar

A lightweight web app that lets you:

1. Record voice notes (browser speech recognition).
2. Convert notes into daily to‑do items.
3. Auto-rank tasks by priority.
4. Sync selected tasks to Google Calendar.

## Features

- **Voice capture** with `webkitSpeechRecognition` (Chrome/Edge support).
- **Task extraction** from spoken text (simple sentence splitting).
- **Priority ranking** using urgency keywords, due-date hints, and effort words.
- **Daily planner view** sorted by highest priority first.
- **Google Calendar event creation** via OAuth 2.0 access token (`gapi` style REST call).
- **Local persistence** with `localStorage`.

## Quick Start

Because this app calls Google APIs, run from a local server (not `file://`).

```bash
python3 -m http.server 5173
# open http://localhost:5173
```

## Google Calendar Setup

1. Go to Google Cloud Console.
2. Create/select a project.
3. Enable **Google Calendar API**.
4. Configure OAuth consent screen.
5. Create OAuth client credentials (**Web application**).
6. Add authorized JavaScript origin:
   - `http://localhost:5173`
7. In `app.js`, replace:
   - `YOUR_GOOGLE_CLIENT_ID`

Once configured, click **Connect Google Calendar** and allow permissions.

## Notes on Priority Logic

Each task gets a score (higher = more urgent):

- Urgency words: `urgent`, `asap`, `today`, `now` (+3)
- Strong priority words: `important`, `critical`, `must` (+2)
- Long-effort words: `project`, `plan`, `prepare` (+1)
- Lower urgency words: `someday`, `later`, `maybe` (-2)

Then mapped into:

- **High**: score >= 4
- **Medium**: score 2–3
- **Low**: score <= 1

## Limitations

- Speech recognition support varies by browser.
- Natural language parsing is intentionally simple for clarity.
- OAuth currently stores token in memory (refresh logic can be added for production).

## Next Improvements

- Better NLP extraction (dates, people, context).
- Calendar sync preferences (default duration, reminders, calendar selection).
- User authentication + backend storage.
- PWA support for mobile voice capture.
