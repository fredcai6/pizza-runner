"""Listening notes for a round: Music Flamingo describes each clip (genre, tempo, key, chords, instruments,
which part carries the melody, production, structure, mood). Notes go to <round>/descriptions.json and
show under each player on the round's page. Never blocks a round: run it after the clips are published.

    ws submit --cores 2 --mem 40G --vram 20G --expect 15m --name pizza-music-describe -- \
        music/describe.sh music/rounds/03.toml

Model: NVIDIA Music Flamingo 2601 (OneWay Noncommercial licence), Transformers MusicFlamingoForConditionalGeneration.
Clips already described are skipped, so a stopped job resumes.
"""
import json, pathlib, sys, time, tomllib

import av, numpy as np, torch
from transformers import AutoProcessor, MusicFlamingoForConditionalGeneration

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import generate  # noqa: E402

MODEL = pathlib.Path("/model")
OUT = pathlib.Path("/music")
generate.OUT = OUT
ASK = ("Describe this track in full detail: the genre, tempo in BPM, and key; the chord progression; "
       "each instrument and which one carries the main melody; the drums and groove; the production and mix; "
       "how it is structured and changes over time; and the mood it creates.")


def load16k(path):
    rs = av.AudioResampler(format="flt", layout="mono", rate=16000)
    with av.open(str(path)) as c:
        chunks = [f.to_ndarray().reshape(-1) for fr in c.decode(audio=0) for f in rs.resample(fr)]
        chunks += [f.to_ndarray().reshape(-1) for f in rs.resample(None)]
    return np.concatenate(chunks)


def main():
    spec = tomllib.loads(pathlib.Path(sys.argv[1]).read_text())
    folder = OUT / spec["round"]
    notes_path = folder / "descriptions.json"
    notes = json.loads(notes_path.read_text()) if notes_path.exists() else {}
    todo = [c[3] for c in generate.clips(spec) if (folder / c[3]).exists() and c[3] not in notes]
    if todo:
        proc = AutoProcessor.from_pretrained(MODEL)
        model = MusicFlamingoForConditionalGeneration.from_pretrained(MODEL, torch_dtype=torch.bfloat16).to("cuda").eval()
        for i, name in enumerate(todo, 1):
            t0 = time.time()
            conv = [{"role": "user", "content": [{"type": "text", "text": ASK},
                                                 {"type": "audio", "audio": load16k(folder / name)}]}]
            inputs = proc.apply_chat_template(conv, tokenize=True, add_generation_prompt=True, return_dict=True).to(model.device)
            inputs["input_features"] = inputs["input_features"].to(model.dtype)
            with torch.inference_mode():
                out = model.generate(**inputs, max_new_tokens=600, do_sample=False)
            notes[name] = proc.batch_decode(out[:, inputs["input_ids"].shape[1]:], skip_special_tokens=True)[0].strip()
            notes_path.write_text(json.dumps(notes, indent=1))
            generate.page(spec, folder)
            print(f"chunk {i}/{len(todo)} {name} {time.time() - t0:.0f}s", flush=True)
    generate.page(spec, folder)
    print(folder / "index.html", flush=True)


if __name__ == "__main__":
    main()
