"""Second-pass Qwen specs for shots the first pass could not give (art/backgrounds/make_paper_spec_rest.py): one toml per city,
backgrounds/CITY/runs/paper_CITY_fix.toml, run "paper/CITY-2". Same prompts, with the amendment each shot needed.
    python backgrounds/make_paper_fixups.py   (from art/)"""
from pathlib import Path

from make_paper_spec_rest import CITIES, IN, door, far, mid

# (city, area, layer) -> new description for that layer's prompt; seeds default to 1..4
FIX = {
    ("chicago", "loop", "mid"): "Soft pastel lavender, dusty rose, cream and blue-grey colours. Tall narrow brick and stone office and loft buildings in a row with plain awnings. The strip above the buildings is flat magenta: no elevated railway, no girders, no pillars, no train.",
}


def write(city):
    out = f'run = "paper/{city}-2"\nseeds = [1, 2, 3, 4]\nrefs = ["paper/style_pm_sq.png"]\n'
    n = 0
    for (c, a, layer), desc in FIX.items():
        if c != city:
            continue
        f = {"far": far, "mid": mid, "door": door}[layer]
        suffix = "-door.png" if layer == "door" else f"-{layer}-flat-ov-half.png"
        out += f'\n[shots.{a}_{layer}]\ninput = "{IN}{a}{suffix}"\nprompt = "{f(desc)}"\n'
        n += 1
    if n:
        (Path(__file__).parent / city / "runs" / f"paper_{city}_fix.toml").write_text(out)
    return n


if __name__ == "__main__":
    for city in CITIES:
        print(city, write(city), "fixup shots")
