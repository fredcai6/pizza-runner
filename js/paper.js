// Paper Theatre for canvas: the same cut as style.css. Cardstock with a white border, a 2px violet rim
// outside it, and a small solid violet drop shadow. Fonts are bundled in assets/fonts.
(function (root) {
  const INK = '#2a1830', TEXT = '#3b2a5a', PAPER = '#fff6df', CORAL = '#ff5a4f', SUN = '#ffc933';
  const display = (size, weight = 600) => `${weight} ${size}px Fredoka, "Trebuchet MS", system-ui, sans-serif`;
  const body = (size, weight = 700) => `${weight} ${size}px Nunito, system-ui, sans-serif`;

  const round = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };

  // A paper card: shadow, rim, white cut border, then the fill. (x, y, w, h) is the fill; the border sits outside it.
  function card(ctx, x, y, w, h, { fill = PAPER, r = 12, b = 4, shadow = 4 } = {}) {
    const o = b + 2;
    ctx.save();
    ctx.fillStyle = INK; round(ctx, x - o + shadow, y - o + shadow + 1, w + o * 2, h + o * 2, r + o); ctx.fill();
    round(ctx, x - o, y - o, w + o * 2, h + o * 2, r + o); ctx.fill();
    ctx.fillStyle = '#fff'; round(ctx, x - b, y - b, w + b * 2, h + b * 2, r + b); ctx.fill();
    ctx.fillStyle = fill; round(ctx, x, y, w, h, r); ctx.fill();
    ctx.restore();
  }

  // A round sticker: the same cut around a disc.
  function disc(ctx, x, y, r, fill, { b = 3, shadow = 3 } = {}) {
    const circle = (cx, cy, rad) => { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rad), 0, 7); ctx.fill(); };
    ctx.save();
    ctx.fillStyle = INK; circle(x + shadow, y + shadow + 1, r + b + 2); circle(x, y, r + b + 2);
    ctx.fillStyle = '#fff'; circle(x, y, r + b);
    ctx.fillStyle = fill; circle(x, y, r);
    ctx.restore();
  }

  // Text on a sticker: a plain fill. Light text on the stage gets a white cut and a violet rim.
  function cutText(ctx, text, x, y, fill = TEXT) {
    ctx.save(); ctx.lineJoin = 'round';
    ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.strokeText(text, x + 2, y + 3);
    ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.strokeText(text, x, y);
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
    ctx.restore();
  }

  root.PR_PAPER = { INK, TEXT, PAPER, CORAL, SUN, display, body, card, disc, cutText, round };
})(window);
