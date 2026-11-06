#!/usr/bin/env python3
"""Cuts the toppings a slice wears from the shot art, one size per pizza style.

Usage: make-pieces.py
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PROPS = ROOT / "assets/backgrounds/props"
TOPPINGS = ("pepperoni", "jalapeno", "garlic", "mushroom", "basil", "pineapple", "sausage")
SIZES = {"ny": 20, "deep": 17, "jumbo": 34, "naples": 15}


def shrink(art, size):
    """Downsizes with hard alpha, so a piece stays crisp pixel art."""
    colour = art.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    alpha = colour.getchannel("A").point(lambda v: 255 if v > 110 else 0)
    colour.putalpha(alpha)
    return colour


def pepperoni():
    """The shot art reads as a ladybird on cheese, so this one comes off Jumbo, whose pepperoni are the largest."""
    x, y, r = 127, 84, 18
    box = Image.open(ROOT / "art/characters/slice-jumbo/sprites/idle/sheet.png").convert("RGBA").crop((x - r, y - r, x + r, y + r))
    round_ = Image.new("L", box.size, 0)
    ImageDraw.Draw(round_).ellipse((0, 0, r * 2 - 1, r * 2 - 1), fill=255)
    box.putalpha(round_)
    return box


for style, size in SIZES.items():
    for topping in TOPPINGS:
        art = pepperoni() if topping == "pepperoni" else Image.open(PROPS / f"shot-{topping}.png")
        shrink(art, size).save(PROPS / f"piece-{topping}-{style}.png")
(PROPS / "pieces-sources.json").write_text(json.dumps({"from": "shot-*.png", "sizes": SIZES}) + "\n")
