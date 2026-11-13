"""Which generated key poses each teen's idle and film use (seeds from runs/paper.toml, job that made them), and the
anim files they produce. Frames that alternate in an anim come from takes that match (skin, hair), or the anim flickers.

    python3 art/paper/teen_picks.py            # rewrite anims/paper-idle.toml and anims/paper-film.toml for every picked teen
"""
import pathlib

ART = pathlib.Path(__file__).resolve().parent.parent
# teen: (idle_a seed, idle_b seed, film_b seed 1, film_b seed 2, job)
PICKS = {
    "teen-b": (2, 2, 1, 3, 618),
    "teen-c": (1, 1, 1, 3, 618),
    "teen-d": (2, 2, 2, 3, 618),
    "teen-e": (2, 2, 1, 3, 618),
    "teen-f": (2, 2, 1, 3, 619),
    "teen-g": (1, 1, 2, 3, 618),
}

IDLE = """master = "characters/{t}/references/paper-master.png"
canvas = [120, 118]
job = {job}
frame_ms = 260
loop = true
run = "paper"
[[frames]]
pose = "idle_a/{a}"
hold = 2
[[frames]]
pose = "idle_b/{b}"
hold = 2
[[frames]]
pose = "idle_a/{a}"
hold = 1
"""
FILM = """master = "characters/{t}/references/paper-master.png"
canvas = [120, 118]
job = {job}
frame_ms = 200
loop = true
run = "paper"
[[frames]]
pose = "film_b/{f1}"
hold = 2
[[frames]]
pose = "film_b/{f2}"
hold = 2
"""

for t, (a, b, f1, f2, job) in PICKS.items():
    d = ART / "characters" / t / "anims"
    (d / "paper-idle.toml").write_text(IDLE.format(t=t, a=a, b=b, job=job))
    (d / "paper-film.toml").write_text(FILM.format(t=t, f1=f1, f2=f2, job=job))
    print(t, "idle", a, b, "film", f1, f2)
