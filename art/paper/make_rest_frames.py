"""Writes the key-pose run files (characters/NAME/runs/paper.toml) for the rest of the cast, to be run once each master is picked
and copied to characters/NAME/references/paper-master.png. Same template as the New York cast (slice-ny/runs/paper.toml).

    python3 art/paper/make_rest_frames.py
"""
import json
from pathlib import Path

ART = Path(__file__).resolve().parents[1]
SQ, TALL = "paper/style_pm_sq.png", "paper/style_pm_tall.png"

TEMPLATE = ("Redraw the character from image 1 exactly as it is: the same paper standee, the same thick white paper border all around the silhouette like a sticker, "
            "the same flat colours, the same face style. Exactly two arms and two legs, two hands. {action} The whole figure is visible in frame with the white border complete. "
            "Image 2 shows only the paper material to borrow; do not copy its characters. The background is one perfectly flat, uniformly lit magenta fill: no spotlight, no gradient, "
            "no cast shadow, no floor shadow and no shadow shapes on the background. Absolutely no text, letters, numbers, logos, labels, signs or lettering anywhere in the image. "
            "Exactly two arms and two legs, no extra limbs or hands.")

COLD = "Cold and stale: the whole body pale grey-blue and stiff, dull toppings, hugging itself shivering, hunched. The face stays deadpan with the same dot eyes and a flat wobbly line mouth."
COLD2 = "Cold and stale: pale grey-blue stiff body, hunched over shivering. The face stays deadpan with the same dot eyes and a flat wobbly line mouth."

PIZZA_SHOTS = {
    "slice-deep": {
        "idle_b": "Idle: standing heavy, drawing a slow breath, slightly taller, a fat drop of red sauce hanging from the crust, mouth a flat heavy line.",
        "idle_c": "Idle: standing, exhaling, slightly lower and sagging, head tilted, the sauce drips sagging, mouth a flat line.",
        "jump_rise": "Jumping upward: legs stretched down and apart, both arms thrown up, mouth a small flat open line, red sauce streaming up off the top.",
        "fall": "Falling down through the air: legs dangling, arms flung up and out, red sauce drips flying upward.",
        "cold_a": COLD.replace("dull toppings", "the sauce dull and dark"), "cold_b": COLD2,
        "special_a": "Ground pound wind-up: leaping high with both white-gloved fists clenched together above the head, legs tucked up, mouth a flat open line, red sauce splashing off the top.",
        "special_b": "Ground pound landing: crouched hard on the ground with one white-gloved fist slammed into the floor, a flat puddle of red sauce splatted around the feet. The face stays deadpan.",
    },
    "slice-jumbo": {
        "idle_b": "Idle: standing, drawing a breath, slightly taller, one thin arm raised in a pompous gesture as if giving a speech, the tip of the slice flopping.",
        "idle_c": "Idle: standing, exhaling, slightly lower, the floppy tip drooping further, head tilted, both thin arms hanging.",
        "jump_rise": "Jumping upward: tiny legs stretched down and apart, both thin arms thrown up, the floppy tip trailing below, mouth a small flat open line.",
        "fall": "Floating down through the air like a wet napkin: the slice tilted, tiny legs dangling, thin arms flung out wide, the floppy tip fluttering up.",
        "cold_a": COLD, "cold_b": COLD2,
        "special_a": "Belly flop leap: flung forward through the air and tilted almost flat, tiny thin arms and legs spread wide, mouth a flat open line.",
        "special_b": "Belly flop landing: lying flat face-down on the ground splatted wide like a pancake, thin arms and legs spread out to the sides, a spreading puddle of melted yellow cheese around the body. The face stays deadpan.",
    },
    "slice-naples": {
        "idle_b": "Idle: standing proudly, drawing a breath, slightly taller, chin up, a hand on the hip.",
        "idle_c": "Idle: standing, exhaling, slightly lower and relaxed, head tilted a little, arms folded.",
        "jump_rise": "Jumping upward: legs stretched down and apart, both arms thrown up, mouth a small flat open line.",
        "fall": "Falling down through the air: legs dangling and kicking, arms flung up and out.",
        "cold_a": COLD.replace("dull toppings", "dull wilted basil"), "cold_b": COLD2,
        "special_a": "Fast dash wind-up: leaning far forward at a sharp angle facing right, one arm pulled back, knees bent, mouth a determined flat line, a few thin speed lines behind.",
        "special_b": "Fast dash streak: stretched almost horizontal and low facing right, one arm forward, legs trailing straight behind, long thin speed lines behind, mouth a flat line.",
    },
}

OTHER_SHOTS = {  # name: (style ref, size, {shot: action})
    "ninja": (TALL, (896, 1152), {
        "idle_b": "Idle: standing in a calm ready stance facing right, knees slightly bent and lower, both hands loose at the sides, head tilted a little.",
        "throw_a": "Throwing wind-up: facing right, the throwing arm cocked far back behind the head holding a small round black pebble, the other arm forward for balance, body twisted, weight on the back leg.",
        "throw_b": "Throwing release: facing right, the throwing arm swung fully forward with the hand open, body leaning forward on the front leg, back leg trailing, follow-through.",
        "leap_a": "Leaping: facing right, launching upward off the legs, body stretched, arms trailing behind, knees bent.",
        "leap_b": "Leaping: facing right, at the top of the jump, body curled, knees tucked, one arm forward, flying.",
        "crouch_a": "Perched crouching: facing right, balanced in a low crouch on both feet with one hand touching a ledge, watching, ready to pounce.",
        "crouch_b": "Perched crouching: facing right, balanced low with the body leaning forward over an edge, one hand out, eyes narrow.",
        "hurt_a": "Hurt: facing right, recoiling backward, head thrown back, arms flung out, eyes squeezed shut as thin lines, off balance.",
        "hurt_b": "Hurt: facing right, doubled over holding the stomach, one knee bent, a few small yellow stars circling above the head.",
    }),
    "mutant": (SQ, (1024, 1024), {
        "idle_b": "Idle: hunched standing, weight on one leg, sniffing the air, both arms dangling.",
        "idle_c": "Idle: hunched, scratching the head with one hand, drooping, the other arm hanging.",
        "bite_a": "Biting wind-up: leaning far back with the mouth wide open showing a row of blunt teeth, both arms raised like claws.",
        "bite_b": "Biting lunge: lunging far forward facing right with the jaws snapped wide open, both arms out in front, leaning onto the front leg.",
    }),
    "alewife": (SQ, (1024, 1024), {
        "idle_b": "Idle: standing, laughing, eyes closed as happy arcs, holding the mug of beer up, the other hand on her hip.",
        "wave_a": "Waving: her free hand raised high and open in a wave, the other hand holding the mug, big smile and a wink.",
        "wave_b": "Waving: her free hand raised to the side at shoulder height, fingers spread, the mug in the other hand, eyes closed in a laugh.",
    }),
}


def write(name, style, size, shots):
    w, h = size
    lines = ['models = ["qwen-edit"]', "seeds = [1, 2, 3]", f"width = {w}", f"height = {h}", 'comfy_args = ["--reserve-vram", "1.5"]',
             f"template = {json.dumps(TEMPLATE)}", f'refs = ["characters/{name}/references/paper-master.png", "{style}"]', ""]
    for k, v in shots.items():
        lines += [f"[shots.{k}]", f"prompt = {json.dumps(v)}", ""]
    (ART / "characters" / name / "runs/paper.toml").write_text("\n".join(lines))


# Plain cheese recruits: the picked pizza master, rebuilt without toppings, looking nervous and hopeful
RECRUIT = {"recruit-deep": "slice-deep", "recruit-jumbo": "slice-jumbo", "recruit-naples": "slice-naples"}
RC_TEXT = ("Redraw the character from image 1 as its plain cheese recruit version: the same slice, the same paper standee, the same thick white paper border, the same flat colours, "
           "the same deadpan face with two small blank black dot eyes and a flat line mouth, but with NO pepperoni, NO tomato, NO basil and no toppings at all, only plain melted cheese "
           "{extra}Standing facing slightly right, both white gloves hanging at the sides. The whole figure is visible in frame with the white border complete. Image 2 shows only the "
           "paper material to borrow; do not copy its characters. The background is one perfectly flat, uniformly lit magenta fill: no spotlight, no gradient, no cast shadow, no floor shadow and "
           "no shadow shapes on the background. Absolutely no text, letters, numbers, logos, labels, signs or lettering anywhere in the image. Exactly two arms and two legs, no extra limbs or hands.")
RC_EXTRA = {"recruit-deep": "(keep the thick crust wall and the sauce on top, with sauce drips, but no sausage or pepperoni). ",
            "recruit-jumbo": "on the huge floppy slice. ", "recruit-naples": "(keep the charred crust and the plain white mozzarella and red sauce, no basil, no tomato slices). "}


def recruits():
    for r, p in RECRUIT.items():
        lines = ['models = ["qwen-edit"]', "seeds = [1, 2, 3]", "width = 1024", "height = 1024", 'comfy_args = ["--reserve-vram", "1.5"]', 'template = "{action}"',
                 f'refs = ["characters/{p}/references/paper-master.png", "{SQ}"]', "", "[shots.rc_B]", f"prompt = {json.dumps(RC_TEXT.format(extra=RC_EXTRA[r]))}", "",
                 "[shots.rc_C]", f"prompt = {json.dumps(RC_TEXT.format(extra=RC_EXTRA[r]).replace('standing facing slightly right, both white gloves hanging at the sides', 'standing facing slightly right, both white gloves held together in front of the chest, nervous and hopeful'))}", ""]
        (ART / "characters" / r / "runs/paper_masters.toml").write_text("\n".join(lines))


if __name__ == "__main__":
    import sys
    which = sys.argv[1:] or ["pizza", "other", "recruit"]
    if "pizza" in which:
        for n, s in PIZZA_SHOTS.items():
            write(n, SQ, (1024, 1024), s)
    if "other" in which:
        for n, (st, sz, s) in OTHER_SHOTS.items():
            write(n, st, sz, s)
    if "recruit" in which:
        recruits()
