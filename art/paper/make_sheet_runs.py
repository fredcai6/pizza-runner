"""Writes the Qwen runs that fill what Tommy's character sheets (2026-11-08) do not draw: cold poses, Sergeant Dayold's talk and
squint, the plain-cheese recruits, Phil without his printed pepperoni. Image 1 is the pose cut from the sheet
(art/paper/sheetcut.py writes it to references/paper-master.png); image 2 is the character's own sheet, for the look.

    python3 art/paper/make_sheet_runs.py      # then forge.generate characters/NAME/runs/sheet_keys.toml qwen-edit
"""
import json
from pathlib import Path

ART = Path(__file__).resolve().parents[1]

TEMPLATE = ("Image 1 is a cartoon pizza mascot cut out as a paper sticker. Redraw the same character: the same shapes, colours, bold dark outline, "
            "thick white sticker border all around the silhouette, the same face style, white cartoon gloves and red sneakers. {action} "
            "The whole figure is visible in frame with the white border complete. Image 2 is this character's model sheet: match its drawing style; "
            "do not copy its layout, labels or other poses. The background is one perfectly flat, uniformly lit magenta fill: no spotlight, no gradient, "
            "no cast shadow, no floor shadow and no shadow shapes on the background. Absolutely no text, letters, numbers, logos, labels, signs or "
            "lettering anywhere in the image. Exactly two arms and two legs, no extra limbs or hands.")

COLD = ("Cold and stale: the whole body, crust and cheese turned pale icy grey-blue and stiff, a little frost on the crust, hugging itself and "
        "shivering, hunched over, the mouth a wobbly worried line.")
PLAIN = ("Make it a plain cheese slice: plain melted yellow cheese with no toppings, {gone}, the same crust, the same simple dot-eyed smiling face, "
         "standing straight, arms relaxed at the sides.")

RUNS = {
    "slice-jumbo": {"cold_a": COLD},
    "slice-deep": {"cold_a": COLD},
    "slice-naples": {"cold_a": COLD + " The basil leaf wilted and dull green."},
    "old-timer": {
        "talk_open": "Talking: the mouth open mid-sentence under the big mustache, one gloved hand raised with a finger pointing up as if lecturing, "
                     "the other fist on the hip, the same stern brows and police hat.",
        "squint": "Squinting suspiciously: both eyes narrowed into thin flat slits under the stern brows, one gloved hand stroking the mustache, "
                  "leaning toward the viewer, the same police hat.",
    },
    "slice-ny": {"cold_a": COLD},
    "recruit-ny": {"master": PLAIN.format(gone="no pepperoni")},
    "recruit-jumbo": {"master": PLAIN.format(gone="no pepperoni")},
    "recruit-deep": {"master": PLAIN.format(gone="no tomato sauce and no parmesan on top, just the cheese inside the tall deep-dish crust")},
    "recruit-naples": {"master": PLAIN.format(gone="no tomato sauce, no basil leaf")},
}
NOPEP = ("Remove every pepperoni slice: where each one was, draw the same melted yellow cheese with its soft shading and drips. "
         "Keep exactly the same pose, outline, face, expression, crust, gloves, sneakers and white border. Change nothing else.")
CUT = "/mnt/data/sprite-forge/runs/{}/sheet/qwen-edit/{}/1.png"   # sheetcut.py's poses
PEPPERONI = ["slice-jumbo", "slice-ny"]   # sheets that print pepperoni on the slice
SOURCE = {"recruit-ny": "slice-ny", "recruit-jumbo": "slice-jumbo", "recruit-deep": "slice-deep", "recruit-naples": "slice-naples"}

HEAD = 'models = ["qwen-edit"]\nseeds = [1, 2, 3]\nwidth = 1024\nheight = 1024\ncomfy_args = ["--reserve-vram", "1.5"]\ntemplate = "{action}"\n'


def main():
    for name, shots in RUNS.items():
        src = SOURCE.get(name, name)
        # a slice whose master is the pepperoni-free redraw starts from the plain cut instead (the redraw comes later)
        first = CUT.format(src, "front") if src in PEPPERONI else f"characters/{src}/references/paper-master.png"
        refs = [first, f"characters/{src}/references/sheet.png"]
        body = HEAD + "".join(f'\n[shots.{k}]\nrefs = {json.dumps(refs)}\nprompt = {json.dumps(TEMPLATE.format(action=v))}\n' for k, v in shots.items())
        out = ART / "characters" / name / "runs" / "sheet_keys.toml"
        out.write_text("# Written by art/paper/make_sheet_runs.py\n" + body)
        print(out.relative_to(ART))
    # Phil's sheet prints pepperoni on him; toppings are the player's pick, and painting them out in code tore his face.
    for name in PEPPERONI:
        body = HEAD + "".join(f'\n[shots.plain_{p}]\nrefs = {json.dumps([CUT.format(name, p), f"characters/{name}/references/sheet.png"])}\n'
                              f'prompt = {json.dumps(TEMPLATE.format(action=NOPEP))}\n' for p in ["front", "jump", "land"])
        (ART / f"characters/{name}/runs/sheet_plain.toml").write_text("# Written by art/paper/make_sheet_runs.py\n" + body)
        print(f"characters/{name}/runs/sheet_plain.toml")


if __name__ == "__main__":
    main()
