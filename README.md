# Pizza Runner

A silly, mysterious platformer. You are a pizza in a post-apocalyptic world where pizza is illegal, racing to be delivered for The Order.

Open `index.html` through any static server. Tests: `node --test`.

- `js/content.js`: all the writing and tuning (cities, toppings, tickets, receipts, radio lines, the ending)
- `js/rules.js`: what persists between runs
- `js/play.js`: one run down one street
- `js/main.js`: comic, pie, wheel and receipt screens

Add `?debug=1` to expose game state as `window.__pr`.
