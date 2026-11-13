"""Turn a round's songs into seamless game loops.

For each clip it looks for a start point in the first seconds and an end point near `loop_seconds`
where the music matches best (rhythm from the onset envelope, colour from coarse band energies),
cuts there, and blends the audio just past the end into the start over one second, so that playing
the file on repeat runs straight on. All loops are set to the same loudness. Writes, per clip:
  loops/<clip>.mp3        the loop as the game plays it
  loops/<clip>-seam.mp3   the last 8 s and first 8 s back to back, to hear across the seam
  loops/loops.json        start and end in the original take, and the loop length

Runs in sprite-forge's ComfyUI image (numpy + PyAV) via loop.sh; CPU only.
"""
import json, pathlib, sys, tomllib

import av, numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import generate  # noqa: E402

OUT = pathlib.Path("/music")
generate.OUT = OUT
RATE = 48000
HOP, WIN = 1024, 2048
FADE = 1.0          # seconds of blend at the seam
MATCH = 6.0         # seconds compared at each candidate point
TARGET_RMS = 0.08   # loudness all loops are set to (peaks kept under 0.95)


def load(path):
    rs = av.AudioResampler(format="fltp", layout="stereo", rate=RATE)
    with av.open(str(path)) as c:
        chunks = [f.to_ndarray() for fr in c.decode(audio=0) for f in rs.resample(fr)]
        chunks += [f.to_ndarray() for f in rs.resample(None)]
    return np.concatenate(chunks, axis=1).astype(np.float32)


def save(path, x):
    x = np.ascontiguousarray(np.clip(x, -1, 1).astype(np.float32))
    tmp = path.with_suffix(".part.mp3")
    with av.open(str(tmp), "w", format="mp3") as c:
        st = c.add_stream("libmp3lame", rate=RATE)
        st.layout = "stereo"
        st.bit_rate = 192000
        for i in range(0, x.shape[1], 4096):
            fr = av.AudioFrame.from_ndarray(np.ascontiguousarray(x[:, i:i + 4096]), format="fltp", layout="stereo")
            fr.sample_rate = RATE
            for p in st.encode(fr):
                c.mux(p)
        for p in st.encode(None):
            c.mux(p)
    tmp.rename(path)


def features(x):
    """Per-frame onset strength and 24 log-spaced band energies."""
    m = x.mean(0)
    n = 1 + (len(m) - WIN) // HOP
    frames = np.lib.stride_tricks.sliding_window_view(m, WIN)[::HOP][:n] * np.hanning(WIN)
    mag = np.abs(np.fft.rfft(frames, axis=1))
    flux = np.maximum(0, np.diff(np.log1p(mag), axis=0)).sum(1)
    flux = np.concatenate([[0], flux])
    edges = np.unique(np.geomspace(2, mag.shape[1] - 1, 25).astype(int))
    bands = np.log1p(np.stack([mag[:, a:b].mean(1) for a, b in zip(edges[:-1], edges[1:])], 1))
    return flux, bands


def best_cut(x, loop_seconds):
    flux, bands = features(x)
    fps = RATE / HOP
    w = int(MATCH * fps)
    starts = np.arange(0, int(12 * fps), 2)
    lo, hi = int((loop_seconds - 10) * fps), int((loop_seconds + 6) * fps)
    hi = min(hi, len(flux) - w - int(FADE * fps) - 1)
    best = (-np.inf, 0, 0)
    win_f = np.lib.stride_tricks.sliding_window_view(flux, w)
    win_f = (win_f - win_f.mean(1, keepdims=True)) / (win_f.std(1, keepdims=True) + 1e-9)
    mean_b = np.stack([bands[i:i + w].mean(0) for i in range(len(bands) - w)])
    mean_b /= np.linalg.norm(mean_b, axis=1, keepdims=True) + 1e-9
    for s in starts:
        cs = np.arange(s + lo, min(s + hi, len(win_f) - 1, len(mean_b) - 1))
        if len(cs) == 0:
            continue
        rhythm = (win_f[cs] * win_f[s]).mean(1)
        colour = mean_b[cs] @ mean_b[s]
        score = rhythm + 4 * (colour - 1)       # colour is near 1; penalise drops in likeness
        i = int(np.argmax(score))
        if score[i] > best[0]:
            best = (float(score[i]), int(s), int(cs[i]))
    _, s, c = best
    return s * HOP, c * HOP, best[0]


def make_loop(x, s, c):
    f = int(FADE * RATE)
    out = x[:, s:c].copy()
    t = np.linspace(0, np.pi / 2, f, dtype=np.float32)
    out[:, :f] = x[:, s:s + f] * np.sin(t) + x[:, c:c + f] * np.cos(t)
    rms = float(np.sqrt(np.mean(out ** 2)))
    gain = TARGET_RMS / max(rms, 1e-6)
    gain = min(gain, 0.95 / max(float(np.abs(out).max()), 1e-6))
    return out * gain


def main():
    spec = tomllib.loads(pathlib.Path(sys.argv[1]).read_text())
    folder = OUT / spec["round"]
    loops = folder / "loops"
    loops.mkdir(exist_ok=True)
    info_path = loops / "loops.json"
    info = json.loads(info_path.read_text()) if info_path.exists() else {}
    for t, seed, d, name in generate.clips(spec):
        if not (folder / name).exists() or name in info:
            continue
        x = load(folder / name)
        s, c, score = best_cut(x, float(spec.get("loop_seconds", 120)))
        out = make_loop(x, s, c)
        save(loops / name, out)
        k = 8 * RATE
        save(loops / name.replace(".mp3", "-seam.mp3"), np.concatenate([out[:, -k:], out[:, :k]], 1))
        info[name] = {"start": round(s / RATE, 3), "end": round(c / RATE, 3), "length": round((c - s) / RATE, 3),
                      "match": round(score, 3)}
        info_path.write_text(json.dumps(info, indent=1))
        print(f"loop {name}: {s / RATE:.2f}s to {c / RATE:.2f}s ({(c - s) / RATE:.1f}s), match {score:.2f}", flush=True)
    generate.page(spec, folder)


if __name__ == "__main__":
    main()
