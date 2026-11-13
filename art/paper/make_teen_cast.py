"""The teen cast: six more teenagers beside the original, so the street is not one white boy in one orange hoodie.

Each is an edit of the original teen's paper master (same pose, size, phone and paper look), with the person and the hoodie
changed. No pink or magenta anywhere on a figure: the backdrop key is magenta. Writes, per teen:
  characters/teen-X/character.toml, pose.toml (the original's body plan), runs/paper_masters.toml (3 seeds),
  and once a master is picked (paper-master.png in references/): runs/paper.toml (idle and film key poses), anims/paper-idle.toml,
  anims/paper-film.toml.

    python3 art/paper/make_teen_cast.py            # write every spec
Cities draw three teens each (js/content.js TEENS).
"""
import pathlib, re

ART = pathlib.Path(__file__).resolve().parent.parent
TEEN = ART / "characters" / "teen"

CAST = {
    "teen-b": ("a teenage girl with dark brown skin and natural black hair in two big round puffs", "green", "bright grass-green"),
    "teen-c": ("a teenage boy with light tan skin and straight black hair in a bowl cut with long bangs over one eye", "navy", "deep navy-blue"),
    "teen-d": ("a teenage girl with warm tan skin and a long dark brown high ponytail", "yellow", "sunny mustard-yellow"),
    "teen-e": ("a teenage girl with medium brown skin and one long thick black braid over her shoulder", "red", "bright tomato-red"),
    "teen-f": ("a Black teenage boy with very dark brown skin and short neat black twists close to the head; replace the messy brown mop of hair entirely, no brown hair", "teal", "teal"),
    "teen-g": ("a teenage girl with pale freckled skin and messy copper-red hair in a loose bun", "grey", "heather-grey"),
}

STYLE_TAIL = ("Paper Mario style papercraft cutout, a standee cut from card: simple bold shapes, clean flat colours, a clear white paper "
              "cut border about as thick as a finger around the entire silhouette, a faint paper grain texture. The face stays as simple "
              "as in image 1: one small dot eye and a flat bored line mouth, no detail. No pink or magenta anywhere on the figure. "
              "Image 2 shows only the drawing style to borrow; do not copy its characters. The background is one perfectly flat, uniformly "
              "lit magenta fill: no spotlight, no gradient, no cast shadow, no floor shadow and no shadow shapes on the background. "
              "Absolutely no text, letters, numbers, logos, labels, signs or lettering anywhere in the image. Exactly two arms and two legs, "
              "no extra limbs or hands.")


def masters(who, hoodie):
    return f'''models = ["qwen-edit"]
seeds = [1, 2, 3]
width = 1024
height = 1024
comfy_args = ["--reserve-vram", "1.5"]
template = "{{action}}"

[shots.m_A]
refs = ["characters/teen/references/paper-master.png", "paper/style_pm_tall.png"]
prompt = "Edit image 1. Keep the exact same paper standee: the same side view facing right, the same pose with the head bowed over the glowing phone held in both hands, the same size and framing, the same baggy blue jeans and big white sneakers, the same thick white paper border. Change only the person: it is now {who}, wearing an oversized {hoodie} hoodie. {STYLE_TAIL}"
'''


def main():
    char = (TEEN / "character.toml").read_text()
    pose = (TEEN / "pose.toml").read_text()
    paper = (TEEN / "runs" / "paper.toml").read_text()
    for name, (who, colour, hoodie) in CAST.items():
        d = ART / "characters" / name
        (d / "runs").mkdir(parents=True, exist_ok=True)
        (d / "references").mkdir(exist_ok=True)
        (d / "anims").mkdir(exist_ok=True)
        desc = f"a lanky cartoon teenager, {who}, in an oversized {hoodie} hoodie, baggy jeans and big sneakers, head bowed over a glowing smartphone held in both hands"
        (d / "character.toml").write_text(re.sub(r'description = ".*"', f'description = "{desc}"', char, count=1)
                                          .replace('name = "teen"', f'name = "{name}"'))
        (d / "pose.toml").write_text(pose)
        (d / "runs" / "paper_masters.toml").write_text(masters(who, hoodie))
        keys = paper.replace("characters/teen/references/paper-master.png", f"characters/{name}/references/paper-master.png")
        keys = re.sub(r"\n\[shots\.film_a\]\nprompt = .*\n", "\n", keys)   # the anims use idle_a, idle_b and film_b
        (d / "runs" / "paper.toml").write_text(keys)
        for anim in ("paper-idle", "paper-film"):
            src = (TEEN / "anims" / f"{anim}.toml").read_text()
            (d / "anims" / f"{anim}.toml").write_text(src.replace("characters/teen/references/paper-master.png", f"characters/{name}/references/paper-master.png")
                                                      .replace("job = 227", "job = 0"))
        print(name, colour)


if __name__ == "__main__":
    main()
