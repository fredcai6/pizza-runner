"""Copy the picked loops into the game: assets/music/<place>.mp3 and assets/music/music.json.

Edit PICKS and re-run to swap a song. A place with no pick of its own borrows another's file
(the finale borrows HQ's until one is chosen). Keys are the game's city ids, plus hq and finale.
"""
import json, pathlib, shutil

SRC = pathlib.Path("/mnt/data/pizza-runner-music")
DEST = pathlib.Path(__file__).resolve().parent.parent / "assets" / "music"
PICKS = {
    "hq": ("round-05", "HQ-s11"),
    "newyork": ("round-05", "NYC-s11"),
    "chicago": ("round-05", "CHI-s11"),
    "dc": ("round-05", "DC-s11"),
    "naples": ("round-05", "NAP-s11"),
    "california": ("round-05", "LB-s11"),
    "finale": "hq",
}

DEST.mkdir(parents=True, exist_ok=True)
out = {}
for place, pick in PICKS.items():
    if isinstance(pick, str):
        continue
    rnd, clip = pick
    info = json.loads((SRC / rnd / "loops" / "loops.json").read_text())[f"{clip}.mp3"]
    shutil.copyfile(SRC / rnd / "loops" / f"{clip}.mp3", DEST / f"{place}.mp3")
    out[place] = {"file": f"{place}.mp3", "length": info["length"], "from": f"{rnd}/{clip}"}
for place, pick in PICKS.items():
    if isinstance(pick, str):
        out[place] = dict(out[pick])
for old in DEST.glob("*.mp3"):
    if old.name not in {v["file"] for v in out.values()}:
        old.unlink()
(DEST / "music.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps(out, indent=1))
