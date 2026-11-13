"""Same motif, each city's own sound: MusicGen stereo-melody-large takes the melody from a source clip
(its chroma, not its sound) and the track description sets everything else.

Runs inside sprite-forge's ComfyUI image (ROCm torch + transformers), launched by musicgen.sh under ws:

    ws submit --cores 2 --mem 24G --vram 14G --expect 15m --priority 10 --name pizza-music -- \
        music/musicgen.sh music/rounds/03.toml

Round file: `melody` (a clip under /music, e.g. round-01/NAP-s11.mp3), `seconds` (MusicGen tops out at 30),
`seeds`, and tracks with `id`, `title`, `tags`, `bpm`, `key`. Clips already made are skipped, so a stopped
job resumes. Weights: MusicGen by Meta, CC BY-NC 4.0 (credit Meta in the game).
"""
import pathlib, sys, time, tomllib

import av, numpy as np, torch
from transformers import MusicgenMelodyForConditionalGeneration, MusicgenMelodyProcessor

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import generate  # noqa: E402  (page builder and clip naming shared with the ACE-Step rounds)

MODEL = pathlib.Path("/model")
OUT = pathlib.Path("/music")
generate.OUT = OUT


def load(path, rate):
    """Decode an audio file to a mono float tensor at `rate`."""
    rs = av.AudioResampler(format="flt", layout="mono", rate=rate)
    with av.open(str(path)) as c:
        chunks = [f.to_ndarray().reshape(-1) for fr in c.decode(audio=0) for f in rs.resample(fr)]
        chunks += [f.to_ndarray().reshape(-1) for f in rs.resample(None)]
    return torch.from_numpy(np.concatenate(chunks))


def save_mp3(path, audio, rate):
    """audio: (channels, samples) float in [-1, 1]."""
    audio = np.clip(audio, -1, 1).astype(np.float32)
    tmp = path.with_suffix(".part.mp3")
    with av.open(str(tmp), "w", format="mp3") as c:
        st = c.add_stream("libmp3lame", rate=rate)
        st.layout = "stereo" if audio.shape[0] == 2 else "mono"
        st.bit_rate = 256000
        for i in range(0, audio.shape[1], 4096):
            fr = av.AudioFrame.from_ndarray(np.ascontiguousarray(audio[:, i:i + 4096]), format="fltp", layout=st.layout)
            fr.sample_rate = rate
            for p in st.encode(fr):
                c.mux(p)
        for p in st.encode(None):
            c.mux(p)
    tmp.rename(path)


def main():
    spec = tomllib.loads(pathlib.Path(sys.argv[1]).read_text())
    folder = OUT / spec["round"]
    folder.mkdir(parents=True, exist_ok=True)
    todo = [c for c in generate.clips(spec) if not (folder / c[3]).exists()]
    if todo:
        dev = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"device {dev}", flush=True)
        proc = MusicgenMelodyProcessor.from_pretrained(MODEL)
        model = MusicgenMelodyForConditionalGeneration.from_pretrained(MODEL, torch_dtype=torch.float16).to(dev).eval()
        rate = model.config.audio_encoder.sampling_rate
        secs = float(spec["seconds"])
        melody = load(OUT / spec["melody"], rate)[: int(rate * secs)]
        for i, (t, seed, _, name) in enumerate(todo, 1):
            t0 = time.time()
            torch.manual_seed(seed)
            text = f'{t["tags"]}, {t["bpm"]} bpm, {t["key"]}'
            inputs = proc(audio=melody.numpy(), sampling_rate=rate, text=[text], padding=True, return_tensors="pt").to(dev)
            # The melody chroma comes out float32; the model runs in float16.
            inputs["input_features"] = inputs["input_features"].to(model.dtype)
            with torch.inference_mode():
                out = model.generate(**inputs, do_sample=True, guidance_scale=spec.get("guidance", 3.0),
                                     max_new_tokens=int(secs * model.config.audio_encoder.frame_rate))
            save_mp3(folder / name, out[0].float().cpu().numpy(), rate)
            print(f"chunk {i}/{len(todo)} {name} {time.time() - t0:.0f}s", flush=True)
            generate.page(spec, folder)
    generate.page(spec, folder)
    print(folder / "index.html", flush=True)


if __name__ == "__main__":
    main()
