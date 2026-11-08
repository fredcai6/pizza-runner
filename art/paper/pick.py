"""Copies a picked generated image in as a character's paper master, with its generation record (and the job that made it).

    python3 art/paper/pick.py CHARACTER RUN SHOT SEED JOB [DEST]
        DEST defaults to characters/CHARACTER/references/paper-master.png (customers: characters/CHARACTER/paper-master.png)
"""
import json, shutil, sys
from pathlib import Path

ART = Path(__file__).resolve().parents[1]
DATA = Path("/mnt/data/sprite-forge/runs")


def main(char, run, shot, seed, job, dest=None):
    src = DATA / char / run / "qwen-edit" / shot / f"{seed}"
    out = ART / (dest or f"characters/{char}/references/paper-master.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(f"{src}.png", out)
    rec = json.loads(Path(f"{src}.json").read_text())
    rec["job"] = int(job)
    out.with_suffix(".json").write_text(json.dumps(rec, indent=1))
    print(char, run, shot, seed, "->", out)


if __name__ == "__main__":
    main(*sys.argv[1:])
