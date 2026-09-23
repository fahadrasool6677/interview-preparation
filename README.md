# Interview Preparation

Monorepo of Node.js learning apps and interview prep materials.

| Folder | Purpose |
| --- | --- |
| `nodejs-interview-prep/` | Static HTML study site (roadmap, 16 phases, assessment) |
| `async-learning/` | Callbacks / promises / async practice |
| `fs-learning/` | Node `fs` module practice |
| `npm-workspace-learning/` | npm workspaces / monorepo practice |
| `test/` | Express playground |

Root `server.js` and `test.js` are quick scratch experiments.

## Run the interview prep site

```bash
cd nodejs-interview-prep
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765/nodejs-interview-preparation.html

See `nodejs-interview-prep/README.md` for full usage.
