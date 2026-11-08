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

def pizza(name, master, canvas, job, seq):
    """seq: {anim: (frame_ms, loop, [frames])}"""
    for a, (ms, loop, fr) in seq.items():
        anim(name, a, master, canvas, job, ms, loop, fr)


PIZZAS = {
    "naples": ("slice-naples", (130, 104), 239, {
        "idle": (200, True, [dict(pose="master", hold=3), dict(pose="master", sink=1, hold=2), dict(pose="idle_c/2")]),
        "jump": (90, False, [dict(pose="jump_rise/3", hold=2)]),
        "fall": (90, True, [dict(pose="fall/1"), dict(pose="fall/2", dy=1)]),
        "cold": (140, True, [dict(pose="cold_a/2", dx=-1), dict(pose="cold_a/1", dx=1)]),
        "special": (80, False, [dict(pose="special_a/1", hold=2), dict(pose="special_a/3", hold=2), dict(pose="special_a/2", hold=2), dict(pose="special_a/3", hold=2)]),
    }),
    "ninja": ("ninja", (128, 118), 239, {
        "idle": (240, True, [dict(pose="master", hold=2), dict(pose="idle_b/1", hold=2), dict(pose="master"), dict(pose="idle_b/3")]),
        "throw": (110, False, [dict(pose="throw_a/2", hold=3), dict(pose="throw_b/1", hold=4)]),
        "leap": (110, False, [dict(pose="leap_a/3", hold=3), dict(pose="leap_b/2", hold=4)]),
        "crouch": (260, True, [dict(pose="crouch_b/1", clip=0.71, hold=2), dict(pose="crouch_b/1", clip=0.71, dy=1, hold=2), dict(pose="crouch_b/1", clip=0.71, dx=-1), dict(pose="crouch_b/1", clip=0.71, dy=1)]),
        "hurt": (130, False, [dict(pose="hurt_a/1", hold=3), dict(pose="hurt_b/2", hold=5)]),
    }),
}

if __name__ == "__main__":
    for what in sys.argv[1:]:
        if what in PIZZAS:
            n, cv, job, seq = PIZZAS[what]
            pizza(n, f"characters/{n}/references/paper-master.png", cv, job, seq)
        if what == "customers":
            for c in CUSTOMERS:
                n = f"customer-{c}"
                anim(n, "idle", f"characters/{n}/paper-master.png", (120, 150), 233, 240, True, IDLE_HELD)
