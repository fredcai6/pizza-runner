"""Rebuilds only the delivery doors (with the street border, paper.STREET) from the picked Qwen runs, leaving every other
layer alone:  python backgrounds/doors_rebuild.py ASSETS_BACKGROUNDS   (from art/)"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import paper_build as pb
import paper_ny_build as nb

root = Path(sys.argv[1])
for city, areas in {"newyork": ("wallstreet", "centralpark", "brooklyn"), **pb.AREAS}.items():
    picks = nb.PICKS if city == "newyork" else pb.PICKS
    for area in areas:
        pk = picks[area]["door"]
        door, meta = nb.build_door(area, pk["run"], pk["seed"])
        d = root / city / area
        Image.fromarray(door, "RGBA").save(d / "door.png", optimize=True)
        src = json.loads((d / "sources.json").read_text())
        (src.get("layers", src))["door"] = meta
        (d / "sources.json").write_text(json.dumps(src, indent=1) + "\n")
        print(city, area, door.shape[1], door.shape[0])
