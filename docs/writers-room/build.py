# Builds index.html: the showrunner's script up top, the room's work folded below.
import json, pathlib
here = pathlib.Path(__file__).parent
parts = [('script', 'The script', 'SCRIPT.md', True), ('edit', 'Story editor notes', 'story-edit.md', False)]
for room in ['springfield', 'adventure-game', 'nintendo', 'cop-show']:
    parts.append((f'pitch-{room}', f'Pitch: {room} room', f'pitch-{room}.md', False))
    parts.append((f'notes-{room}', f'Table-read notes: {room} room', f'notes-{room}.md', False))
data = [{'id': i, 'title': t, 'md': (here / f).read_text(), 'open': o} for i, t, f, o in parts]
html = """<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pizza Runner: writers' room script</title>
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<style>body{font:17px/1.55 Georgia,serif;max-width:46em;margin:auto;padding:1em 1.2em;background:#fbf4e6;color:#2a1830}
pre{background:#2a1830;color:#ffe9b8;padding:.9em;white-space:pre-wrap;border-radius:6px;font-size:15px}
details{margin:1em 0;border-top:2px solid #c8321e;padding-top:.5em}summary{font-weight:bold;cursor:pointer;font-size:1.15em}
h1{color:#c8321e}</style></head><body><h1>Pizza Runner: the writers' room</h1>
<p>Four Sonnet rooms (Springfield, adventure-game, Nintendo localisation, cop-show parody) each pitched a full pass, gave each other table-read notes; a showrunner cut one script, a cold story editor checked that it holds together, and the showrunner revised. The script is first; the room's work is folded below.</p>
<div id="out"></div><script>const D=__DATA__;const o=document.getElementById('out');
for(const d of D){const e=document.createElement('details');e.open=d.open;e.innerHTML='<summary>'+d.title+'</summary>'+marked.parse(d.md);o.appendChild(e);}</script></body></html>"""
(here / 'index.html').write_text(html.replace('__DATA__', json.dumps(data).replace('</', '<\\/')))
