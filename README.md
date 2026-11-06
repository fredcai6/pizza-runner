# Pizza Runner

Open `index.html` through any static server. Tests: `node --test` for the rules; `tests/behavior.js`, `tests/browser.js` and `tests/balance.js` need Chromium.

- `js/content.js`: all the writing and tuning. Story text here is draft unless it says otherwise.
- `js/rules.js`: what persists: the city network, deliveries, retries, reserves
- `js/play.js`: one slice out on the streets
- `js/map.js`: the city map between slices
- `js/hq.js`: the back room and its scenes
- `js/board.js`: the corkboard
- `js/sprites.js`: loads sprite-forge output listed in `assets/manifest.json`
- `js/main.js`: flow between them

`scripts/import-sprites.py` brings a sprite-forge animation into `assets/`. Art is optional per
character: anything missing keeps its placeholder.

| Art name | Animations it can use |
|---|---|
| `slice-ny`, `slice-deep`, `slice-jumbo`, `slice-naples` | `idle` `run` `jump` `fall` `cold`, plus `special` except New York |
| `teen` | `idle` `walk` `film` `flee` |
| `turtle` | `walk` `munch` `stun` |
| `ninja` | `idle` `walk` `throw` `leap` `crouch` `hurt` |
| `mutant` | `idle` `run` `bite` |
| `old-timer`, `alewife`, `customer-CITY-AREA` | `idle` |

Paintings load per city from `assets/backgrounds/CITY/AREA/`, falling back to `CITY/`.

Add `?debug=1` to expose game state as `window.__pr`.
