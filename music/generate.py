"""Generate a round of background-music candidates with ACE-Step 1.5 and build a listening page.

    ws submit --cores 2 --mem 28G --vram 18G --expect 20m --name pizza-music -- \
        python3 music/generate.py music/rounds/01.toml

A round file lists tracks (style tags, bpm, key, seconds) and the seeds to try. Each clip lands in
/mnt/data/pizza-runner-music/<round>/ as MP3; clips already there are skipped, so a stopped job resumes.
The page (index.html beside the clips) is rebuilt at the end and can be rebuilt alone with --page.
ComfyUI runs in sprite-forge's container (comfy/run.sh), which reads weights from /mnt/data/models/comfy.
"""
import html, json, pathlib, shutil, signal, subprocess, sys, time, tomllib, urllib.error, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
RUN_SH = pathlib.Path.home() / "projects/sprite-forge/comfy/run.sh"
COMFY_OUT = pathlib.Path("/mnt/data/sprite-forge/out")
OUT = pathlib.Path("/mnt/data/pizza-runner-music")
API = "http://127.0.0.1:8188"
CONTAINER = "pizza-music-comfy"
COMFY_IN = pathlib.Path("/mnt/data/sprite-forge/in")


def post(path, body):
    req = urllib.request.Request(API + path, json.dumps(body).encode(), {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=30))


def get(path):
    return json.load(urllib.request.urlopen(API + path, timeout=30))


def wait_up(proc, secs=300):
    for _ in range(secs):
        if proc.poll() is not None:
            sys.exit(f"ComfyUI exited with {proc.returncode}")
        try:
            return get("/system_stats")
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            time.sleep(1)
    sys.exit("ComfyUI did not come up")


def graph(t, seed, prefix, denoise=None):
    """The blueprint 'Text to Audio (ACE-Step 1.5)' in API form: turbo model, 8 steps, cfg 1.

    With a `source` the track is a cover of that clip: the clip goes in as ACE-Step's reference audio
    (which turns on its cover mode and turns off the language model's own audio codes). denoise 1.0
    re-performs it from noise; lower values start from the clip itself and keep more of it.
    """
    secs = float(t["seconds"])
    src = t.get("source")
    g = {
        "unet": {"class_type": "UNETLoader", "inputs": {"unet_name": "acestep_v1.5_turbo.safetensors", "weight_dtype": "default"}},
        "shift": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["unet", 0], "shift": 3}},
        "clip": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "qwen_0.6b_ace15.safetensors", "clip_name2": "qwen_4b_ace15.safetensors", "type": "ace", "device": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": "ace_1.5_vae.safetensors"}},
        "pos": {"class_type": "TextEncodeAceStepAudio1.5", "inputs": {
            "clip": ["clip", 0], "tags": t["tags"], "lyrics": t.get("lyrics", "[Instrumental]"), "seed": seed,
            "bpm": int(t["bpm"]), "duration": secs, "timesignature": str(t.get("time", 4)), "language": "en",
            "keyscale": t["key"], "generate_audio_codes": not src, "cfg_scale": 2.0, "temperature": 0.85,
            "top_p": 0.9, "top_k": 0, "min_p": 0.0}},
        "neg": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["pos", 0]}},
        "latent": {"class_type": "EmptyAceStep1.5LatentAudio", "inputs": {"seconds": secs, "batch_size": 1}},
        "sample": {"class_type": "KSampler", "inputs": {
            "model": ["shift", 0], "positive": ["pos", 0], "negative": ["neg", 0], "latent_image": ["latent", 0],
            "seed": seed, "steps": 8, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "decode": {"class_type": "VAEDecodeAudio", "inputs": {"samples": ["sample", 0], "vae": ["vae", 0]}},
        "save": {"class_type": "SaveAudioMP3", "inputs": {"audio": ["decode", 0], "filename_prefix": prefix, "quality": "V0"}},
    }
    if src:
        g["src"] = {"class_type": "LoadAudio", "inputs": {"audio": staged(src)}}
        g["src_lat"] = {"class_type": "VAEEncodeAudio", "inputs": {"audio": ["src", 0], "vae": ["vae", 0]}}
        g["ref"] = {"class_type": "ReferenceTimbreAudio", "inputs": {"conditioning": ["pos", 0], "latent": ["src_lat", 0]}}
        g["sample"]["inputs"]["positive"] = ["ref", 0]
        if denoise < 1:
            g["sample"]["inputs"]["latent_image"] = ["src_lat", 0]
            g["sample"]["inputs"]["denoise"] = denoise
    return g


def staged(src):
    """Copy a source clip (a path under OUT, e.g. round-01/NAP-s11.mp3) into ComfyUI's input folder."""
    name = "pizza-music-" + src.replace("/", "-")
    COMFY_IN.mkdir(parents=True, exist_ok=True)
    if not (COMFY_IN / name).exists():
        shutil.copyfile(OUT / src, COMFY_IN / name)
    return name


def run(g, dest):
    pid = post("/prompt", {"prompt": g})["prompt_id"]
    t0 = time.time()
    while True:
        h = get(f"/history/{pid}").get(pid)
        if h:
            if h["status"].get("status_str") == "error":
                raise RuntimeError(json.dumps(h["status"].get("messages"))[-1500:])
            f = h["outputs"]["save"]["audio"][0]
            shutil.copyfile(COMFY_OUT / f["subfolder"] / f["filename"], dest)
            return time.time() - t0
        time.sleep(0.5)


def clips(spec):
    """(track, seed, denoise, file name) for every clip in the round."""
    for t in spec["tracks"]:
        for seed in t.get("seeds", spec.get("seeds", [1])):
            if t.get("source"):
                for d in t.get("denoise", spec.get("denoise", [1.0])):
                    yield t, seed, d, f"{t['id']}-s{seed}-d{round(d * 100)}.mp3"
            else:
                yield t, seed, None, f"{t['id']}-s{seed}.mp3"


def label(t, seed, d):
    if d is None:
        return f"take {seed}"
    return f"take {seed} · " + ("cover from scratch" if d >= 1 else f"remix, {round(d * 100)}% changed")


def page(spec, folder):
    notes_path = folder / "descriptions.json"
    notes = json.loads(notes_path.read_text()) if notes_path.exists() else {}
    note_for = lambda name: (f'<details><summary>Listening notes (Music Flamingo)</summary><p class="notes">'
                             f'{html.escape(notes[name])}</p></details>' if name in notes else "")
    rows = []
    for t in spec["tracks"]:
        players = "".join(
            f'<figure><figcaption>{html.escape(t["id"])} · {label(t, seed, d)}</figcaption><audio controls preload="none" src="{name}"></audio>{note_for(name)}</figure>'
            for tt, seed, d, name in clips(spec) if tt is t and (folder / name).exists())
        rows.append(f'<section><h2>{html.escape(t["id"])}: {html.escape(t["title"])}</h2>'
                    f'<p class="tags">{html.escape(t["tags"])}</p>'
                    f'<p class="meta">{t["bpm"]} bpm · {html.escape(t["key"])} · {t.get("seconds", spec.get("seconds"))} s'
                    + (f' · from {html.escape(t["source"])}' if t.get("source") else "") + f'</p>{players}</section>')
    note = html.escape(spec.get("note", ""))
    (folder / "index.html").write_text(f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Pizza Runner music: {html.escape(spec['round'])}</title>
<style>body{{font:16px/1.5 system-ui,sans-serif;max-width:760px;margin:0 auto;padding:16px;background:#fdf6e8;color:#2a1f18}}
h1{{font-size:1.4rem}}h2{{font-size:1.1rem;margin:0 0 4px}}section{{background:#fff;border:1px solid #0002;border-radius:12px;padding:14px;margin:14px 0}}
.tags{{margin:0;color:#6b5747;font-size:.9rem}}.meta{{margin:2px 0 8px;color:#6b5747;font-size:.85rem}}
figure{{margin:8px 0}}figcaption{{font-size:.85rem;font-weight:600}}audio{{width:100%}}details{{margin:4px 0 0;font-size:.88rem}}summary{{cursor:pointer;color:#6b5747}}.notes{{white-space:pre-wrap;margin:6px 0}}</style></head><body>
<h1>Pizza Runner music: {html.escape(spec['round'])}</h1><p>{note}</p>{''.join(rows)}</body></html>""")


def main():
    args = sys.argv[1:]
    only_page = "--page" in args
    path = pathlib.Path([a for a in args if not a.startswith("--")][0])
    spec = tomllib.loads(path.read_text())
    folder = OUT / spec["round"]
    folder.mkdir(parents=True, exist_ok=True)
    todo = [c for c in clips(spec) if not (folder / c[3]).exists()]
    if not only_page and todo:
        env = {"FORGE_CONTAINER": CONTAINER}
        import os
        proc = subprocess.Popen([RUN_SH], env={**os.environ, **env},
                                stdout=open(OUT / f"comfy-{spec['round']}.log", "a"), stderr=subprocess.STDOUT)
        stop = lambda *_: (subprocess.run(["docker", "stop", "-t", "5", CONTAINER]), sys.exit(143))
        signal.signal(signal.SIGTERM, stop)
        try:
            wait_up(proc)
            for i, (t, seed, d, name) in enumerate(todo, 1):
                secs = run(graph(t, seed, f"pizza-music/{spec['round']}/{name[:-4]}", d), folder / name)
                print(f"chunk {i}/{len(todo)} {name} {secs:.0f}s", flush=True)
                page(spec, folder)
        finally:
            subprocess.run(["docker", "stop", "-t", "5", CONTAINER], capture_output=True)
    page(spec, folder)
    print(folder / "index.html")


if __name__ == "__main__":
    main()
