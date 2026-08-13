"""Build transparent, registered Ari assets from the checked-in source artwork.

Run from the dashboard repository root with Python 3, Pillow, and NumPy installed:
    python scripts/normalize_ari_assets.py

The script never invents or redraws mascot pixels. It removes the near-cream source
paper, registers the eight loader frames against Ari's main teal silhouette, and
writes deterministic lossless WebP assets plus an alignment manifest.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
LOADER_SOURCE = BRAND / "ari-untangle-registered-v3.webp"
LOADER_OUTPUT = BRAND / "ari-untangle-normalized-v4.png"
LOADER_MANIFEST = BRAND / "ari-untangle-normalized-v4.json"
FRAME_COUNT = 8
SOURCE_FRAME_WIDTH = 543
SOURCE_FRAME_HEIGHT = 724
OUTPUT_FRAME_SIZE = 640
TARGET_TEAL_X = OUTPUT_FRAME_SIZE // 2
TARGET_FOREGROUND_Y = OUTPUT_FRAME_SIZE // 2

STATIC_ASSETS = {
    "ari-avatar-light-sheet.png": "ari-avatar-light-transparent-v2.webp",
    "ari-avatar-dark-sheet.png": "ari-avatar-dark-transparent-v2.webp",
}


def paper_profile(rgb: np.ndarray) -> np.ndarray:
    # The old registered sprite contains wide vertical paper bands. Ari never
    # reaches the top/bottom margins, so a per-column median models that paper
    # without treating the bands as foreground.
    margin = min(96, max(12, rgb.shape[0] // 8))
    samples = np.concatenate((rgb[:margin], rgb[-margin:]), axis=0)
    return np.median(samples, axis=0)[None, :, :]


def remove_paper(image: Image.Image, *, remove_vertical_seams: bool = False) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32)
    rgb = rgba[:, :, :3]
    paper = paper_profile(rgb)
    distance = np.sqrt(np.sum(((rgb - paper) * np.array([0.9, 1.0, 0.8], dtype=np.float32)) ** 2, axis=2))
    alpha = np.clip((distance - 9.0) / 26.0, 0.0, 1.0) * (rgba[:, :, 3] / 255.0)

    # Preserve the authored colors. The dashboard canvas is already warm, and
    # retaining the original antialiasing avoids dark or oversaturated halos.
    output = np.dstack((rgb, alpha[:, :, None] * 255.0)).astype(np.uint8)
    output[alpha < 0.01, :3] = 0
    if remove_vertical_seams:
        # The legacy loader WebP has narrow full-height encoder seams at
        # different x positions in each frame. Static Ari art can legitimately
        # span most of a column, so this repair is loader-only.
        for x in range(output.shape[1]):
            if np.count_nonzero(output[:, x, 3] > 24) > output.shape[0] * 0.45:
                output[:, x, :] = 0
    return Image.fromarray(output, "RGBA")


def largest_teal_centroid(image: Image.Image) -> tuple[float, float]:
    rgba = np.asarray(image, dtype=np.uint8)
    red, green, blue, alpha = (rgba[:, :, index] for index in range(4))
    mask = (alpha > 64) & (green > 90) & (blue > 75) & (green.astype(np.int16) - red.astype(np.int16) > 24) & (blue.astype(np.int16) - red.astype(np.int16) > 14)
    seen = np.zeros(mask.shape, dtype=bool)
    best: list[tuple[int, int]] = []
    height, width = mask.shape
    for y, x in zip(*np.where(mask)):
        if seen[y, x]:
            continue
        component: list[tuple[int, int]] = []
        queue = deque([(int(y), int(x))])
        seen[y, x] = True
        while queue:
            current_y, current_x = queue.pop()
            component.append((current_y, current_x))
            for next_y, next_x in ((current_y - 1, current_x), (current_y + 1, current_x), (current_y, current_x - 1), (current_y, current_x + 1)):
                if 0 <= next_y < height and 0 <= next_x < width and mask[next_y, next_x] and not seen[next_y, next_x]:
                    seen[next_y, next_x] = True
                    queue.append((next_y, next_x))
        if len(component) > len(best):
            best = component
    if not best:
        raise RuntimeError("Could not locate Ari's teal silhouette")
    points = np.asarray(best)
    return float(points[:, 1].mean()), float(points[:, 0].mean())


def foreground_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > 32)
    if not len(xs):
        raise RuntimeError("Transparent asset has no foreground")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def build_loader() -> None:
    source = Image.open(LOADER_SOURCE).convert("RGB")
    if source.size != (SOURCE_FRAME_WIDTH * FRAME_COUNT, SOURCE_FRAME_HEIGHT):
        raise RuntimeError(f"Unexpected loader source size: {source.size}")
    sprite = Image.new("RGBA", (OUTPUT_FRAME_SIZE * FRAME_COUNT, OUTPUT_FRAME_SIZE), (0, 0, 0, 0))
    frames = []
    for index in range(FRAME_COUNT):
        frame = remove_paper(source.crop((index * SOURCE_FRAME_WIDTH, 0, (index + 1) * SOURCE_FRAME_WIDTH, SOURCE_FRAME_HEIGHT)), remove_vertical_seams=True)
        teal_x, _ = largest_teal_centroid(frame)
        left, top, right, bottom = foreground_bbox(frame)
        offset_x = round(TARGET_TEAL_X - teal_x)
        offset_y = round(TARGET_FOREGROUND_Y - ((top + bottom) / 2))
        canvas = Image.new("RGBA", (OUTPUT_FRAME_SIZE, OUTPUT_FRAME_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(frame, (offset_x, offset_y))
        final_bbox = foreground_bbox(canvas)
        final_teal_x, final_teal_y = largest_teal_centroid(canvas)
        frames.append({
            "index": index,
            "sourceForegroundBox": [left, top, right, bottom],
            "translation": [offset_x, offset_y],
            "foregroundBox": list(final_bbox),
            "tealCentroid": [round(final_teal_x, 2), round(final_teal_y, 2)],
        })
        sprite.alpha_composite(canvas, (index * OUTPUT_FRAME_SIZE, 0))
    # PNG keeps alpha exact across this unusually wide sprite. Pillow's WebP
    # encoder introduced full-height alpha seams at several internal columns.
    sprite.save(LOADER_OUTPUT, "PNG", optimize=True, compress_level=9)
    LOADER_MANIFEST.write_text(json.dumps({
        "asset": LOADER_OUTPUT.name,
        "source": LOADER_SOURCE.name,
        "frameCount": FRAME_COUNT,
        "frameWidth": OUTPUT_FRAME_SIZE,
        "frameHeight": OUTPUT_FRAME_SIZE,
        "transparent": True,
        "registration": {"tealCentroidX": TARGET_TEAL_X, "foregroundCenterY": TARGET_FOREGROUND_Y},
        "playback": {"framesPerSecond": 2, "secondsPerFrame": 0.5, "sequence": [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]},
        "frames": frames,
    }, indent=2) + "\n", encoding="utf-8")


def build_static_assets() -> None:
    for source_name, output_name in STATIC_ASSETS.items():
        source = Image.open(BRAND / source_name).convert("RGBA")
        rgba = np.asarray(source, dtype=np.uint8).copy()
        height, width = rgba.shape[:2]
        y, x = np.ogrid[:height, :width]
        radius = min(width, height) * 0.43
        distance = np.sqrt((x - width / 2) ** 2 + (y - height / 2) ** 2)
        rgba[:, :, 3] = np.clip((radius + 2.0 - distance) / 2.0, 0.0, 1.0) * 255
        Image.fromarray(rgba, "RGBA").save(BRAND / output_name, "WEBP", lossless=True, method=6)


if __name__ == "__main__":
    build_loader()
    build_static_assets()
    print(f"Wrote {LOADER_OUTPUT.relative_to(ROOT)} and {len(STATIC_ASSETS)} transparent static assets")
