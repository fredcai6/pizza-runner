# Pizza Runner

Open `index.html` through any static server. Tests: `node --test`.

- `js/content.js`: all the writing and tuning. Story text here is draft unless it says otherwise.
- `js/rules.js`: what persists between runs
- `js/play.js`: one run down one street
- `js/hq.js`: the back room and its scenes
- `js/board.js`: the corkboard
- `js/sprites.js`: loads sprite-forge output listed in `assets/manifest.json`
- `js/main.js`: flow between them

`scripts/import-sprites.py` brings a sprite-forge animation into `assets/`. Art is optional per
character: anything missing keeps its placeholder.

| Art name | Animations it can use |
|---|---|
| `slice-ny`, `slice-deep`, `slice-jumbo`, `slice-naples`, `slice-thin` | `idle` `run` `jump` `cold`, plus `special` except New York |
| `teen`, `turtle`, `ninja`, `mutant` | `idle` `walk` |
| `old-timer`, `customer`, `alewife` | `idle` |

Add `?debug=1` to expose game state as `window.__pr`.
