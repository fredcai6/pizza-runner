"""Writes characters/NAME/anims/paper-*.toml for the rest of the cast. Poses name the shot/seed picked from each run (see the PICKS notes in the PR).

    python3 art/paper/make_rest_anims.py customers|naples|deep|jumbo|ninja|mutant|alewife|recruits
"""
import sys
from pathlib import Path

ART = Path(__file__).resolve().parents[1]

CUSTOMERS = ["chicago-loop", "chicago-lincolnpark", "chicago-wickerpark", "dc-georgetown", "dc-mall", "dc-federal",
             "naples-harbor", "naples-center", "naples-hillside", "california-downtown", "california-beach"]


def frames(seq):
    out = []
    for f in seq:
        out.append("[[frames]]\n" + "\n".join(f"{k} = {v!r}".replace("'", '"') if isinstance(v, str) else f"{k} = {v}" for k, v in f.items()) + "\n")
    return "\n".join(out)


def anim(name, a, master, canvas, job, ms, loop, seq, run="paper"):
    text = (f'master = "{master}"\ncanvas = [{canvas[0]}, {canvas[1]}]\njob = {job}\nframe_ms = {ms}\nloop = {str(loop).lower()}\nrun = "{run}"\n' + frames(seq))
    d = ART / "characters" / name / "anims"
    d.mkdir(parents=True, exist_ok=True)
    (d / f"paper-{a}.toml").write_text(text)


IDLE_HELD = [dict(pose="master", hold=2), dict(pose="master", sink=1), dict(pose="master", hold=1)]

if __name__ == "__main__":
    for what in sys.argv[1:]:
        if what == "customers":
            for c in CUSTOMERS:
                n = f"customer-{c}"
                anim(n, "idle", f"characters/{n}/paper-master.png", (120, 150), 233, 240, True, IDLE_HELD)
