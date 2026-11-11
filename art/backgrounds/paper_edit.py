"""Qwen-Image-Edit 2511 over arbitrary-size layers for the paper art. Unlike forge.generate it never resizes a ref:
image 1 is the layer to restyle (its size is the output size), the later refs are style references.
    ws submit --priority 10 --vram 30G --mem 8G --cores 2 --expect 30m --name NAME -- \
      env PYTHONPATH=~/projects/sprite-forge ~/projects/sprite-forge/.venv/bin/python backgrounds/paper_edit.py SPEC.toml
Run from art/. Spec: run = "paper/ny-x", seeds = [1,2], [shots.NAME] input = "path", refs = ["style.png"], prompt = "...",
steps (opt), width/height (opt, default input size). Paths are relative to art/. Output:
DATA/runs/RUN/qwen-edit/SHOT/SEED.png (+ .json). Finished images are skipped, so a rerun resumes."""
import hashlib, json, signal, subprocess, sys, time, tomllib
from pathlib import Path

from PIL import Image

from forge.generate import DATA, REPO, publish, rev, run_prompt, wait_up
from forge.workflows import qwen_edit

ART = Path(__file__).resolve().parents[1]


def stage(path):
    img = Image.open(ART / path).convert("RGB")
    name = hashlib.sha256(img.tobytes()).hexdigest()[:16] + ".png"
    (DATA / "in").mkdir(parents=True, exist_ok=True)
    img.save(DATA / "in" / name)
    return name, img.size


def main():
    spec = tomllib.loads(Path(sys.argv[1]).read_text())
    base = DATA / "runs" / spec["run"] / "qwen-edit"
    todo = [(shot, s, seed) for shot, s in spec["shots"].items() for seed in s.get("seeds", spec["seeds"])
            if not (base / shot / f"{seed}.png").exists()]
    print(f"{len(todo)} images to make", flush=True)
    if not todo:
        return
    proc = subprocess.Popen([REPO / "comfy/run.sh", "--reserve-vram", "1.0"], stdout=open(DATA / "comfy.log", "a"), stderr=subprocess.STDOUT)
    stop = lambda *_: (subprocess.run(["docker", "stop", "-t", "5", "sprite-forge-comfy"]), sys.exit(143))
    signal.signal(signal.SIGTERM, stop)
    try:
        wait_up(proc)
        meta = rev()
        for n, (shot, s, seed) in enumerate(todo, 1):
            out = base / shot / f"{seed}.png"
            out.parent.mkdir(parents=True, exist_ok=True)
            names = [stage(p) for p in [s["input"], *s.get("refs", spec.get("refs", []))]]
            w, h = s.get("width", names[0][1][0]), s.get("height", names[0][1][1])
            t = time.time()
            graph = qwen_edit(s["prompt"], [x[0] for x in names], seed, w, h, "paper", steps=s.get("steps", 4))
            run_prompt(graph, out)
            secs = round(time.time() - t, 1)
            out.with_suffix(".json").write_text(json.dumps({"model": "qwen-edit", "shot": shot, "seed": seed, "prompt": s["prompt"],
                "input": s["input"], "refs": s.get("refs", spec.get("refs", [])), "size": [w, h], "secs": secs, "rev": meta}, indent=1))
            print(f"chunk {n}/{len(todo)} {shot} {seed} {secs}s", flush=True)
    finally:
        subprocess.run(["docker", "stop", "-t", "5", "sprite-forge-comfy"], capture_output=True)


if __name__ == "__main__":
    main()
