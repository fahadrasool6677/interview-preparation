# Node.js Interview Preparation — Execution Steps

## Requirements

- Python 3 (for the local static server)
- A modern browser (Chrome, Firefox, Edge, or Cursor Simple Browser)

No `npm install` is required to study the site.

---

## 1. Start the local server

From this folder:

```bash
cd nodejs-interview-prep
python3 -m http.server 8765 --bind 127.0.0.1
```

Leave this terminal open while you study.

---

## 2. Open the hub

In your browser, open:

```text
http://127.0.0.1:8765/nodejs-interview-preparation.html
```

Do **not** rely on opening the HTML via `file://` inside Cursor’s preview — phase links often fail there. Always use the HTTP URL above.

---

## 3. Use the study site

1. On the hub, take the **Initial assessment** (optional but recommended).
2. Click a phase under **Jump into a phase** or **Study phases** in the sidebar.
3. On each phase page:
   - Use the sticky TOC to jump between topics
   - Read Concept → Why → Running example
   - Attempt interview questions aloud before expanding **Reveal**
   - Check **Mark as reviewed** when done (saved in this browser via `localStorage`)
4. For JavaScript / Coding phases, use the **Run** button on in-page examples.
5. Update the hub **Progress tracker** as you finish major areas.

---

## 4. Stop the server

In the terminal running the server, press:

```text
Ctrl + C
```

---

## 5. Regenerate phase pages (optional)

Only needed if you change the generators under `scripts/`:

```bash
cd nodejs-interview-prep
node scripts/generate-phases-01-04.js
node scripts/generate-phases-05-08.js
node scripts/generate-phases-09-12.js
node scripts/generate-phases-13-16.js
```

Then hard-refresh the browser (`Ctrl + Shift + R`).

---

## Project layout

| Path | Purpose |
| --- | --- |
| `nodejs-interview-preparation.html` | Hub: roadmap, plans, assessment, tracker |
| `phases/*.html` | 16 study phases with topic cards |
| `assets/prep.css` | Shared styles |
| `assets/prep.js` | Nav, reveal, JS runner, progress |
| `scripts/` | Generators that rebuild phase HTML |
| `prompts/` | Source interview-prep prompts |
| `research/` | Market research notes |

---

## Quick troubleshooting

| Problem | Fix |
| --- | --- |
| Phase links do nothing | Use `http://127.0.0.1:8765/...`, not `file://` |
| Port already in use | Pick another port, e.g. `python3 -m http.server 8766 --bind 127.0.0.1`, then open that port in the URL |
| Styles/scripts missing | Confirm the server was started from `nodejs-interview-prep/` |
| Progress disappeared | Progress is per-browser `localStorage`; clearing site data removes it |
