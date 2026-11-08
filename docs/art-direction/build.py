#!/usr/bin/env python3 -I
"""Build the Pizza Runner art-direction mood board (self-contained index.html).

  python3 -I build.py --fetch      # download refs into /tmp/pr-moodboard/refs (untrusted; own dir), then build
  python3 -I build.py              # build from already-downloaded refs

Refs are processed only as images with PIL (Image.open + convert + resize, re-encoded to JPEG).
Raw downloads stay outside the repo. refs/SOURCES.md is regenerated with every source URL.
"""
import base64, io, json, os, subprocess, sys, time, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # run with -I, so add our own dir explicitly
from build_data import REFS
from build_dirs import DIRS
from PIL import Image

RAW = '/tmp/pr-moodboard/refs'
ASSETS = '/home/tommy/projects/pizza-runner/assets/'
PIXEL = {'wario4','shantae','tmnt','metalslug','sunset','smrpg','sor2','jsr','parappa','pm_ttyd1'}
Image.MAX_IMAGE_PIXELS = 50_000_000

def page_url(u):
    p = urllib.parse.unquote(u)
    parts = p.split('/')
    name = parts[-2] if '/thumb/' in p else parts[-1]
    if '/thumb/' in p: name = parts[parts.index('thumb') + 3]
    host = 'commons.wikimedia.org' if '/commons/' in p else 'en.wikipedia.org'
    return f'https://{host}/wiki/File:{urllib.parse.quote(name)}'

def fetch():
    os.makedirs(RAW, exist_ok=True)
    for k, v in REFS.items():
        out = f'{RAW}/{k}.bin'
        if os.path.exists(out): continue
        subprocess.run(['curl','-s','-m','30','-A','moodboard/1.0 (research; local)','-o',out,v[0]], check=True)
        time.sleep(2)

def ref_jpeg(k):
    im = Image.open(f'{RAW}/{k}.bin'); im.load()
    if im.mode in ('RGBA','LA','P'):
        im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, (244,236,220,255)); bg.alpha_composite(im); im = bg
    im = im.convert('RGB'); w = im.width
    if w > 600: im = im.resize((600, round(im.height*600/w)), Image.LANCZOS)
    elif k in PIXEL and w <= 300:
        f = max(1, 600//w); im = im.resize((w*f, im.height*f), Image.NEAREST)
    elif k in PIXEL and w < 600 and w >= 240:
        f = 2 if w*2 <= 640 else 1; im = im.resize((w*f, im.height*f), Image.NEAREST)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=80); return b.getvalue()

def b64(b): return base64.b64encode(b).decode()
def png_uri(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return 'data:image/png;base64,' + b64(b.getvalue())
def jpg_uri(b): return 'data:image/jpeg;base64,' + b64(b)

# ---------- current art ----------
def frame(d, i=0):
    at = json.load(open(ASSETS + d + '/atlas.json')); w, h = at['frame']['w'], at['frame']['h']
    return Image.open(ASSETS + d + '/sheet.png').convert('RGBA').crop((i*w, 0, (i+1)*w, h))
def street(c):
    base = Image.new('RGBA', (1280, 720), (0,0,0,255))
    for l in ['far','mid','ground','near']:
        p = ASSETS + f'backgrounds/{c}/{l}.png'
        if os.path.exists(p): base.alpha_composite(Image.open(p).convert('RGBA').crop((300,0,1580,720)))
    return base.convert('RGB')
def jpg_im(im, w=640, q=82):
    im = im.convert('RGB'); im = im.resize((w, round(im.height*w/im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q); return b.getvalue()
def crop_trim(im):
    bb = im.getbbox(); return im.crop(bb) if bb else im
def scaled(im, k): return im.resize((im.width*k, im.height*k), Image.NEAREST)

SPR = {  # css class -> (path, frame index)
 'ny': 'sprites/slice-ny/idle', 'dp': 'sprites/slice-deep/idle', 'jb': 'sprites/slice-jumbo/idle', 'np': 'sprites/slice-naples/idle',
 'ot': 'sprites/old-timer/idle', 'cu': 'sprites/customer-newyork-brooklyn/idle', 'cu2': 'sprites/customer-dc-mall/idle', 'tn': 'sprites/teen/idle',
}
PK = ['pepperoni','basil','garlic','jalapeno','mushroom','pineapple','sausage']

def sprite_css():
    css = []
    for cls, d in SPR.items():
        im = crop_trim(frame(d)); css.append(f'.sp.{cls}{{background-image:url({png_uri(im)});aspect-ratio:{im.width}/{im.height}}}')
    for p in PK:
        im = Image.open(ASSETS + f'backgrounds/props/pickup-{p}.png').convert('RGBA'); im = crop_trim(im)
        css.append(f'.pk.{p}{{background-image:url({png_uri(im)});aspect-ratio:{im.width}/{im.height}}}')
    return '\n'.join(css)

def now_strip():
    B = (58, 40, 62, 255)
    def card(im, k=3):
        im = scaled(crop_trim(im), k); c = Image.new('RGBA', (im.width + 24, im.height + 24), B); c.alpha_composite(im, (12, 12)); return c.convert('RGB')
    items = [
     (jpg_im(card(frame('sprites/slice-ny/idle')), 300), 'Slice (NY)', 'Painted large, downsampled, 4 px violet outline. Face drawn by the model, so each slice has a different face.', 'tall'),
     (jpg_im(card(frame('sprites/old-timer/idle')), 300), 'Old Timer', 'Pixel-painted, close to the intended mustache and police hat, but a different face grammar from the hero.', 'tall'),
     (jpg_im(card(frame('sprites/customer-newyork-brooklyn/idle')), 300), 'Customer (Brooklyn)', 'The "generic AI" look: plausible, nicely shaded, but nothing says this game.', 'tall'),
     (jpg_im(street('newyork/brooklyn'), 560), 'Street (Brooklyn)', 'Soft and light, as STYLE.md asks, but the buildings carry foreground-style shading and a thin outline.', 'wide'),
     (jpg_im(Image.open(ASSETS + 'backgrounds/hq/back.png'), 560), 'Back room and blank corkboard', 'A plain cork rectangle: the corkboard and its Polaroids have to be dressed in whatever direction is chosen.', 'wide'),
     (jpg_im(Image.open(ASSETS + 'backgrounds/maps/newyork.png'), 560), 'City map (New York)', 'A stylised street map: the UI surface that must match the world, whichever way we go.', 'wide'),
    ]
    out = []
    for b, t, n, cls in items:
        out.append(f'<figure class="now {cls}"><img src="{jpg_uri(b)}" alt="{t}"><figcaption><b>{t}</b> {n}</figcaption></figure>')
    return '\n'.join(out)

# ---------- face formula diagrams ----------
WEDGE = 'M12 30 Q60 8 108 30 L60 130 Z'
CRUST = 'M10 28 Q60 4 110 28 Q108 44 98 46 Q60 24 22 46 Q12 42 10 28Z'
def face_svg(k):
    Y, R, K = '#f5b82a', '#c01c28', '#1b1410'
    if k == 'd6':
        u = 4; r = []
        def row(y, hw, c):
            x0 = 15 - hw; r.append(f'<rect x="{x0*u}" y="{y*u}" width="{(2*hw+1)*u}" height="{u}" fill="{c}"/>')
        for y in range(-1, 29): row(y+3, max(0, 13 - y//2 + 1), '#2a1830') if y < 28 else None
        for y in range(0, 28): row(y+3, max(0, 13 - y//2), Y if y > 4 else '#d98a2a')
        for (x, y) in [(11,14),(19,17),(14,22)]: r.append(f'<rect x="{x*u}" y="{y*u}" width="{3*u}" height="{3*u}" fill="{R}"/>')
        for ex in (11, 17):
            r.append(f'<rect x="{ex*u}" y="{10*u}" width="{3*u}" height="{4*u}" fill="#fff"/><rect x="{(ex+1)*u}" y="{11*u}" width="{2*u}" height="{3*u}" fill="#2a1830"/><rect x="{(ex+1)*u}" y="{11*u}" width="{u}" height="{u}" fill="#fff"/>')
        r.append(f'<rect x="{13*u}" y="{16*u}" width="{4*u}" height="{u}" fill="#2a1830"/>')
        r.append(f'<rect x="{9*u}" y="{8*u}" width="{4*u}" height="{u}" fill="#2a1830"/><rect x="{17*u}" y="{8*u}" width="{4*u}" height="{u}" fill="#2a1830"/>')
        r.append(f'<rect x="{12*u}" y="{31*u}" width="{3*u}" height="{4*u}" fill="#2a1830"/><rect x="{16*u}" y="{31*u}" width="{3*u}" height="{4*u}" fill="#2a1830"/>')
        return f'<svg viewBox="0 0 120 150" shape-rendering="crispEdges">{"".join(r)}</svg>'
    s = {'d1': 'white', 'd2': K, 'd3': K, 'd4': K, 'd5': K}[k]
    sw = {'d1': 5, 'd2': 4.5, 'd3': 4, 'd4': 3.5, 'd5': 4.5}[k]
    cheese = {'d1': '#ffc933', 'd2': '#f2d28a', 'd3': '#f2c419', 'd4': '#ffd400', 'd5': Y}[k]
    crust = {'d1': '#f09a3e', 'd2': '#d9a85a', 'd3': '#e08a22', 'd4': '#f08a00', 'd5': '#d98a2a'}[k]
    pep = {'d1': '#ff5a4f', 'd2': '#b32424', 'd3': '#e03a5a', 'd4': '#ff3b30', 'd5': R}[k]
    g = []
    g.append(f'<g stroke-linejoin="round" stroke-linecap="round">')
    # legs and arms
    if k == 'd2':
        g.append(f'<path d="M48 120 Q40 140 30 138 M72 120 Q80 142 92 138 M16 56 Q-2 72 10 92 M104 56 Q122 72 110 92" fill="none" stroke="{K}" stroke-width="7"/><path d="M48 120 Q40 140 30 138 M72 120 Q80 142 92 138 M16 56 Q-2 72 10 92 M104 56 Q122 72 110 92" fill="none" stroke="#f4e9cf" stroke-width="3"/><circle cx="10" cy="94" r="9" fill="#fff" stroke="{K}" stroke-width="3"/><circle cx="110" cy="94" r="9" fill="#fff" stroke="{K}" stroke-width="3"/><ellipse cx="28" cy="140" rx="12" ry="6" fill="{K}"/><ellipse cx="94" cy="140" rx="12" ry="6" fill="{K}"/>')
    else:
        g.append(f'<path d="M48 118 L46 142 M72 118 L74 142 M18 56 L8 96 M102 56 L112 96" fill="none" stroke="{s if k!="d1" else "white"}" stroke-width="{7 if k=="d1" else 8}"/>')
        lc = {'d1': '#f09a3e', 'd3': '#d9a05a', 'd4': '#f08a00', 'd5': '#d98a2a'}[k]
        g.append(f'<path d="M48 118 L46 142 M72 118 L74 142 M18 56 L8 96 M102 56 L112 96" fill="none" stroke="{lc}" stroke-width="4"/><circle cx="8" cy="98" r="8" fill="#fff" stroke="{K if k!="d1" else "white"}" stroke-width="3"/><circle cx="112" cy="98" r="8" fill="#fff" stroke="{K if k!="d1" else "white"}" stroke-width="3"/><ellipse cx="45" cy="144" rx="10" ry="5" fill="{pep if k in ("d1","d4") else K}"/><ellipse cx="75" cy="144" rx="10" ry="5" fill="{pep if k in ("d1","d4") else K}"/>')
    g.append(f'<path d="{WEDGE}" fill="{cheese}" stroke="{s}" stroke-width="{sw}"/>')
    g.append(f'<path d="{CRUST}" fill="{crust}" stroke="{s}" stroke-width="{sw}"/>')
    if k == 'd5':
        g.append(f'<path d="M60 8 L108 30 L60 130 Z" fill="#000" opacity=".55" stroke="none"/>')
    for (x, y, rr) in [(36, 56, 7), (82, 70, 7), (60, 100, 6)]:
        g.append(f'<circle cx="{x}" cy="{y}" r="{rr}" fill="{pep}" {"stroke="+K+" stroke-width=2.5" if k in ("d2","d3","d4","d5") else ""}/>')
    # face
    if k == 'd1':
        g.append('<circle cx="48" cy="62" r="6" fill="#1b1410"/><circle cx="72" cy="62" r="6" fill="#1b1410"/><circle cx="50" cy="60" r="2" fill="#fff"/><circle cx="74" cy="60" r="2" fill="#fff"/><path d="M52 78 Q60 86 68 78" fill="none" stroke="#1b1410" stroke-width="3.5"/><circle cx="38" cy="76" r="5" fill="#ff7f8a" stroke="none"/><circle cx="82" cy="76" r="5" fill="#ff7f8a" stroke="none"/>')
    elif k == 'd2':
        for x in (48, 72):
            g.append(f'<ellipse cx="{x}" cy="62" rx="8" ry="12" fill="{K}" stroke="none"/><path d="M{x} 62 L{x+7} 56 L{x+7} 68Z" fill="#fff" stroke="none"/>')
        g.append(f'<ellipse cx="60" cy="86" rx="9" ry="6" fill="{K}" stroke="none"/><path d="M40 46 Q48 40 56 46 M64 46 Q72 40 80 46" fill="none" stroke="{K}" stroke-width="3.5"/>')
    elif k == 'd3':
        g.append(f'<circle cx="46" cy="60" r="12" fill="#fff" stroke="{K}" stroke-width="3.5"/><circle cx="76" cy="62" r="14" fill="#fff" stroke="{K}" stroke-width="3.5"/><circle cx="48" cy="62" r="3" fill="{K}" stroke="none"/><circle cx="74" cy="64" r="3.5" fill="{K}" stroke="none"/><path d="M36 56 L44 52 M84 52 L72 54 M40 66 L44 62" stroke="#d1204a" stroke-width="1.5" fill="none"/><path d="M32 44 L56 52 M66 48 L90 42" stroke="{K}" stroke-width="5" fill="none"/><path d="M42 88 Q60 108 82 86 Q60 94 42 88Z" fill="{K}" stroke="{K}" stroke-width="3"/><path d="M47 90 L50 95 L53 91 L56 96 L59 91 L62 96 L66 91 L70 95 L74 90" fill="none" stroke="#fff" stroke-width="3.5"/>')
    elif k == 'd4':
        g.append(f'<ellipse cx="47" cy="62" rx="9" ry="11" fill="#fff" stroke="{K}" stroke-width="3.5"/><ellipse cx="73" cy="62" rx="9" ry="11" fill="#fff" stroke="{K}" stroke-width="3.5"/><circle cx="50" cy="64" r="3.5" fill="{K}" stroke="none"/><circle cx="76" cy="64" r="3.5" fill="{K}" stroke="none"/><path d="M48 86 Q60 96 72 86" fill="none" stroke="{K}" stroke-width="3.5"/><path d="M38 46 L56 48 M64 48 L82 46" stroke="{K}" stroke-width="3.5"/>')
    elif k == 'd5':
        for x in (47, 73):
            g.append(f'<ellipse cx="{x}" cy="62" rx="9" ry="8" fill="#e8dfc8" stroke="{K}" stroke-width="3"/><circle cx="{x+2}" cy="64" r="3" fill="{K}" stroke="none"/><path d="M{x-10} 62 L{x+10} 62 L{x+10} 52 L{x-10} 52Z" fill="{Y}" stroke="{K}" stroke-width="3"/>')
        g.append(f'<path d="M36 50 L58 56 M64 56 L84 50" stroke="{K}" stroke-width="5"/><path d="M50 86 L72 86" stroke="{K}" stroke-width="4.5"/>')
    g.append('</g>')
    return f'<svg viewBox="-6 -4 132 156">{"".join(g)}</svg>'

# ---------- mock-up UI ----------
def mock_html(k, ui):
    topp = ''.join(f'<div class="cell{" sel" if i == 0 else ""}"><i class="pk {p}"></i></div>' for i, p in enumerate(PK + ['pepperoni']))
    bites = ''.join('<i></i>' for _ in range(5))
    tiles = {
     'title': f'<div class="m m-title"><div class="sky"></div><div class="skyline"></div><div class="logo"><span>PIZZA</span><span>RUNNER</span></div><div class="sp ny" style="left:9%;bottom:5%;width:19%"></div><div class="menu"><div class="btn sel">START</div><div class="btn">MAP</div><div class="btn">BACK ROOM</div></div></div>',
     'select': f'<div class="m m-select"><div class="hd pnl">BUILD YOUR PIE</div><div class="grid">{topp}</div><div class="big"><div class="spot"></div><div class="sp ny"></div></div><div class="plate pnl">P1 &middot; NY SLICE</div><div class="stats"><div class="pnl"><span>JUMP</span><b style="width:70%"></b></div><div class="pnl"><span>HEAT</span><b style="width:55%"></b></div><div class="pnl"><span>WEIGHT</span><b style="width:40%"></b></div></div></div>',
     'receipt': '<div class="m m-receipt"><div class="rc"><h4>MARIO\'S SLICE</h4><p>1 PEPPERONI &nbsp;&nbsp;&nbsp; 3.50</p><p>1 EXTRA HEAT &nbsp;&nbsp; 0.00</p><p>TIP (FOR RUNNING) &nbsp; ?</p><hr><p>DELIVER TO: TONY</p><p>BROOKLYN, 9:41 PM</p><div class="stamp">HOT</div></div><div class="rc tag"><h4>NOTE</h4><p>He saw you.</p></div></div>',
     'board': '<div class="m m-board"><svg class="str" viewBox="0 0 320 180" preserveAspectRatio="none"><path d="M60 54 L160 120 L262 50 M160 120 L156 30" /></svg><div class="pol p1"><div class="ph"><div class="sp cu"></div><div class="bush b1"></div><div class="bush b2"></div></div><span>9:41 PM</span></div><div class="pol p2"><div class="ph"><div class="sp cu2"></div><div class="bush b1"></div><div class="bush b2"></div></div><span>DC?</span></div><div class="pol p3"><div class="ph"><div class="sp tn"></div><div class="bush b1"></div><div class="bush b2"></div></div><span>THEM</span></div><div class="note">WHO TIPS<br>IN COINS?</div></div>',
     'dialog': '<div class="m m-dialog"><div class="bg"></div><div class="sp ot" style="left:6%;bottom:30%;width:19%"></div><div class="sp ny" style="right:8%;bottom:30%;width:16%"></div><div class="dlg pnl"><div class="nm">OLD TIMER</div><p>Rookie. The cheese goes cold, the trail goes cold. Move.</p><i>&#9654;</i></div></div>',
     'hud': f'<div class="m m-hud"><div class="bg"></div><div class="sp ny" style="left:30%;bottom:12%;width:17%"></div><div class="top"><div class="heat pnl"><b></b><span>HEAT</span></div><div class="bites">{bites}</div><div class="tp pnl"><i class="pk garlic"></i><span>x3</span></div><div class="cd pnl"><span>SLAM</span></div></div></div>',
     'map': '<div class="m m-map"><svg viewBox="0 0 320 180"><path class="road" d="M20 140 L110 140 L110 80 L220 80 L220 30 M110 140 L200 150 L290 120 M220 80 L290 80 L290 120"/><path class="route" d="M20 140 L110 140 L110 80 L220 80"/><g class="node"><circle cx="20" cy="140" r="7"/><circle cx="110" cy="140" r="7"/><circle cx="110" cy="80" r="7"/><circle cx="220" cy="80" r="7"/><circle cx="220" cy="30" r="7"/><circle cx="290" cy="120" r="7"/></g><circle class="cur" cx="220" cy="80" r="11"/><text class="lbl" x="116" y="160">THE LOOP</text><text class="lbl" x="226" y="22">LINCOLN PARK</text><text class="lbl" x="226" y="104">DELIVERY</text></svg></div>',
    }
    order = [('title', 'Title / main menu'), ('select', 'Build Your Pie (character select)'), ('receipt', 'Receipts'), ('board', 'Corkboard and Polaroids'), ('dialog', 'Dialogue box'), ('hud', 'In-run HUD'), ('map', 'City map')]
    out = []
    for key, label in order:
        out.append(f'<figure class="mk"><div class="frame">{tiles[key]}</div><figcaption><b>{label}.</b> {ui[key]}</figcaption></figure>')
    return '\n'.join(out)

CSS = open(HERE + '/style.css').read()

def build():
    if '--fetch' in sys.argv: fetch()
    font = base64.b64encode(open(ASSETS + 'fonts/pixelify-sans-latin-700-normal.woff2', 'rb').read()).decode()
    css = CSS.replace('/*FONT*/', f"@font-face{{font-family:'Pixelify';font-weight:700;src:url(data:font/woff2;base64,{font}) format('woff2')}}") + '\n' + sprite_css()
    secs = []; nav = []
    for n, d in enumerate(DIRS, 1):
        nav.append(f'<a href="#{d["key"]}">{n}. {d["name"]}</a>')
        figs = []
        for r in d['refs']:
            u, work, who, take = REFS[r]
            figs.append(f'<figure class="ref"><img loading="lazy" src="{jpg_uri(ref_jpeg(r))}" alt="{work}"><figcaption><b>{work}</b><br><i>{who}</i><br>{take}</figcaption></figure>')
        c = d['concrete']
        lvl, ptxt = d['pipeline']
        secs.append(f'''<section class="dir {d["key"]}" id="{d["key"]}">
<h2><span class="num">{n}</span> {d["name"]}</h2>
<p class="take">{d["take"]}</p>
<p class="pitch">{d["pitch"]}</p>
<div class="refs">{"".join(figs)}</div>
<div class="two"><div>
<h3>What it means for this game</h3>
<dl><dt>Pizza faces (one formula)</dt><dd>{c["faces"]}</dd><dt>Outlines</dt><dd>{c["outlines"]}</dd><dt>Palette</dt><dd>{c["palette"]}</dd><dt>Backgrounds and depth</dt><dd>{c["depth"]}</dd><dt>Customers</dt><dd>{c["customers"]}</dd></dl></div>
<div class="facebox"><div class="fsvg">{face_svg(d["key"])}</div><p>Face formula sketch on a blank slice. Same parts for every character.</p></div></div>
<h3>UI treatment: does every screen look like the same game?</h3>
<p class="same"><b>{d["same_game"]}</b></p>
<p class="mocknote">Quick mock-ups below use today's slice, Old Timer and customer sprites as placeholders, restyled only by the UI layer. They show layout, material, type and shape language, not final art.</p>
<div class="{d["key"]} mocks">{mock_html(d["key"], d["ui"])}</div>
<div class="two b"><div><h3>Pipeline fit <span class="lvl">{lvl}</span></h3><p>{ptxt}</p></div><div><h3>Risks</h3><p>{d["risks"]}</p></div></div>
</section>''')
    # strip the per-section .dN class from mocks wrapper only: theme classes are on section and on .mocks both (scoped CSS uses .dN)
    rows = ''.join(f'<tr><td>{n}. {d["name"]}</td><td>{d["pipeline"][0]}</td><td>{d["take"]}</td></tr>' for n, d in enumerate(DIRS, 1))
    html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pizza Runner: art direction mood board</title><style>{css}</style></head><body>
<header><h1>Pizza Runner: art direction mood board</h1><p>Six bold directions for one identity, for Tommy to choose from. Each one covers characters, backgrounds <em>and</em> every UI surface, because the real complaint is cohesion. Built 2026-11-07.</p>
<nav>{"".join(nav)}</nav></header>
<main>
<section class="now"><h2>Where we are now</h2><p>Current in-game assets from <code>assets/</code>, at native resolution (sprites enlarged 3x with no smoothing). Complaints from the playtest: faces differ across characters, customers feel "generically AI", background objects are shaded like foreground silhouettes, and receipts, menus and the corkboard look plain.</p><div class="nowstrip">{now_strip()}</div></section>
<section class="rec"><h2>Recommendation</h2>
<p><b>Pick: 1. Paper Theatre.</b> Cohesion is a material problem, and paper is a material we can apply to everything. The corkboard, Polaroids, receipts and map are already paper, so the menus stop being a separate problem. Flat standees with one dot-eye face formula are what image models do most reliably at 124 px; a style LoRA trained on about 12 hand-drawn keys can hold the formula, and the drop-shadow rule fixes the background-versus-foreground complaint (only touchable things get a shadow). It keeps the silly, birthday-present warmth and leaves room for the real story, which lives in the eyebrows.</p>
<p><b>Runner-up: 5. Case File Noir.</b> It gives the strongest conspiracy and Dispatch tone and is mostly a post-process, so it would unify whatever the model gives us. I would graft its corkboard, typewriter receipts, red stamps and CLASSIFIED cut-ins onto Paper Theatre rather than choose between them. The safe fallback if neither is wanted is 6. Arcade Pixel, which is the current pipeline with a locked palette and stamped faces.</p>
<p class="small">Pipeline notes are my assessment from reading STYLE.md and the sprite atlases; none of these directions has been generated or tested yet. A cheap next step is to hand-draw one slice and one customer in the top two styles and run a LoRA or edit-model test on each.</p></section>
<nav class="jump">{"".join(nav)}</nav>
{"".join(secs)}
<section class="cmp"><h2>At a glance</h2><table><tr><th>Direction</th><th>Pipeline</th><th>One-line take</th></tr>{rows}</table></section>
</main><footer>Reference images are low-resolution fair-use screenshots, public-domain stills and CC-licensed images from Wikipedia and Wikimedia Commons, shown for art-direction study only. Source URLs: docs/art-direction/refs/SOURCES.md.</footer></body></html>'''
    open(HERE + '/index.html', 'w').write(html)
    with open(HERE + '/refs/SOURCES.md', 'w') as f:
        f.write('# Reference sources (images are not stored in the repo)\n\n')
        for n, d in enumerate(DIRS, 1):
            f.write(f'## {n}. {d["name"]}\n')
            for r in d['refs']:
                u, work, who, take = REFS[r]
                f.write(f'- {work} ({who})\n  - file page: {page_url(u)}\n  - image: {u}\n')
            f.write('\n')
    print('wrote', HERE + '/index.html', os.path.getsize(HERE + '/index.html') // 1024, 'KB')

if __name__ == '__main__': build()
