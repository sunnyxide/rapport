"""Build a clean horizontal showcase montage from the 3 QA screenshots.

Normalizes each panel to the same height on a white canvas with thin borders.
The tall full-page dossier is cropped to its top region first so heights
normalize without becoming a thin sliver.
"""
from __future__ import annotations

import os
from PIL import Image, ImageOps

SRC = "/Users/sunny/Desktop/OrbtAgent"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

PANEL_H = 720          # normalized panel height
GAP = 28               # white gap between panels
MARGIN = 40            # outer white margin
BORDER = 1             # thin gray hairline
BORDER_RGB = (226, 226, 226)
BG = (255, 255, 255)

# (file, optional top-crop aspect = width/height). None = no crop.
PANELS = [
    ("rapport_3011.png", None),                 # landing hero
    ("qa_yeop_dossier.png", 0.62),              # tall full-page -> crop top region
    ("qa_donghun_disambiguation.png", None),    # disambiguation gate
]


def load_panel(fname: str, crop_aspect: float | None) -> Image.Image:
    img = Image.open(os.path.join(SRC, fname)).convert("RGB")
    if crop_aspect is not None:
        w, _ = img.size
        crop_h = int(w / crop_aspect)
        crop_h = min(crop_h, img.size[1])
        img = img.crop((0, 0, w, crop_h))
    # scale to PANEL_H
    scale = PANEL_H / img.size[1]
    new_w = int(img.size[0] * scale)
    img = img.resize((new_w, PANEL_H), Image.LANCZOS)
    img = ImageOps.expand(img, border=BORDER, fill=BORDER_RGB)
    return img


def main() -> None:
    panels = [load_panel(f, a) for f, a in PANELS]
    total_w = sum(p.size[0] for p in panels) + GAP * (len(panels) - 1) + MARGIN * 2
    total_h = max(p.size[1] for p in panels) + MARGIN * 2
    canvas = Image.new("RGB", (total_w, total_h), BG)
    x = MARGIN
    for p in panels:
        y = (total_h - p.size[1]) // 2
        canvas.paste(p, (x, y))
        x += p.size[0] + GAP
    out = os.path.join(OUT_DIR, "showcase.png")
    canvas.save(out, optimize=True)
    print(f"showcase: {out}  {canvas.size}")


if __name__ == "__main__":
    main()
