"""
Cuts the couple's two invitation artworks into web assets.

  py design/build-art.py

Sources (design/source/) are the printed invitation card and the chinoiserie
card. Outputs land in public/art/ (served) and private/ (served only behind
the password gate). Re-run after replacing a source file.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "source"
OUT = ROOT / "public" / "art"
PRIVATE = ROOT / "private"
OUT.mkdir(parents=True, exist_ok=True)
PRIVATE.mkdir(parents=True, exist_ok=True)

WHITE = (255, 255, 255)


def color_to_alpha_white(im: Image.Image, floor: int = 14) -> Image.Image:
    """GIMP-style colour-to-alpha against white: paper drops out, linework keeps
    its exact apparent colour when composited back onto a light ground."""
    rgb = im.convert("RGB")
    r, g, b = rgb.split()
    # alpha = 255 - min(r, g, b)
    a = ImageChops.invert(ImageChops.darker(ImageChops.darker(r, g), b))
    # drop JPEG noise and the faint ivory card tint
    a = a.point(lambda v: 0 if v < floor else min(255, int((v - floor) * 255 / (255 - floor))))

    def unmix(ch):
        # c' = 255 - (255 - c) * 255 / alpha
        inv = ImageChops.invert(ch)
        out = Image.new("L", ch.size)
        ip, ap, op = inv.load(), a.load(), out.load()
        w, h = ch.size
        for y in range(h):
            for x in range(w):
                av = ap[x, y]
                op[x, y] = 255 if av == 0 else max(0, 255 - min(255, ip[x, y] * 255 // av))
        return out

    res = Image.merge("RGBA", (unmix(r), unmix(g), unmix(b), a))
    return res


def feather(alpha: Image.Image, px: int) -> Image.Image:
    """Fade alpha to zero within px of every edge, so crops never show a seam."""
    w, h = alpha.size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rectangle([px, px, w - px - 1, h - px - 1], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(px / 2))
    return ImageChops.multiply(alpha, m)


def save_webp(im: Image.Image, path: Path, quality: int = 82):
    im.save(path, "WEBP", quality=quality, method=6, alpha_quality=80)
    print(f"  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB")


# ---------------------------------------------------------------- invitation frame
card = Image.open(SRC / "invitation-card.jpg").convert("RGB")
blank = card.copy()
d = ImageDraw.Draw(blank)
# Every printed line of text, erased so the site can set live, bilingual type.
for box in [
    (470, 505, 770, 545),    # top divider
    (418, 550, 825, 862),    # title, Patrick block, "and", parents
    (398, 862, 842, 958),    # Ivy block
    (420, 958, 820, 1210),   # invitation paragraph, dress code, divider, details
]:
    d.rectangle(box, fill=WHITE)

# Crop symmetric about the frame's centre line (x = 620.5) so CSS rails set in
# percentages line up with the artwork at any width.
X0, X1 = 180, 1061
# Rail columns in crop coordinates (measured: 4 lines per side, ~3.5px wide).
RAILS = [(96, 101), (104, 109), (130, 136), (138, 144), (738, 743), (746, 752), (771, 777), (780, 786)]


def fade_edge_keep_rails(im: Image.Image, depth: int, edge: str) -> Image.Image:
    """Where a crop cuts through vines, fade them out over `depth` px, but keep
    the four gold rails at full strength so the CSS rails continue them exactly."""
    a = im.getchannel("A")
    ap = a.load()
    w, h = im.size
    for y in range(h):
        dist = (h - 1 - y) if edge == "bottom" else y
        if dist >= depth:
            continue
        f = (dist / depth) ** 1.6
        for x in range(w):
            if any(x0 <= x <= x1 for x0, x1 in RAILS):
                continue
            ap[x, y] = int(ap[x, y] * f)
    im.putalpha(a)
    return im


top = fade_edge_keep_rails(color_to_alpha_white(blank.crop((X0, 190, X1, 700))), 110, "bottom")
bottom = fade_edge_keep_rails(color_to_alpha_white(blank.crop((X0, 870, X1, 1352))), 70, "top")
save_webp(top, OUT / "frame-top.webp")
save_webp(bottom, OUT / "frame-bottom.webp")

# The printed card itself, for guests who want to see it (served behind the gate).
save_webp(card.crop((150, 170, 1093, 1370)), PRIVATE / "invitation-card.webp", 86)

# ---------------------------------------------------------------- chinoiserie card
chin = Image.open(SRC / "chinoiserie-card.jpg").convert("RGB")
w, h = chin.size
# Flood-fill the white outside the scalloped gold edge to transparent.
flood = chin.copy()
for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
    if sum(flood.getpixel(seed)) > 735:
        ImageDraw.floodfill(flood, seed, (255, 0, 255), thresh=28)
fp = flood.load()
alpha = Image.new("L", (w, h), 255)
ap = alpha.load()
for y in range(h):
    for x in range(w):
        if fp[x, y] == (255, 0, 255):
            ap[x, y] = 0
alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
gate = chin.copy()
gate.putalpha(alpha)
save_webp(gate, OUT / "gate-card.webp", 84)


def key_sprig(region):
    """Lift the painted vines off the faint background pattern: keep what is
    dark (leaves, stems) or pink (blossoms); drop pale beige branches."""
    im = chin.crop(region).convert("RGB")
    a = Image.new("L", im.size, 0)
    px, apx = im.load(), a.load()
    W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            lum = 0.3 * r + 0.59 * g + 0.11 * b
            a_dark = (188 - lum) / 38
            a_pink = ((r - g) - 28) / 30 if abs(g - b) < 38 else 0
            a_orng = ((r - g) - 55) / 30 if (g - b) >= 38 and lum < 200 else 0
            v = max(0.0, min(1.0, max(a_dark, a_pink, a_orng)))
            apx[x, y] = int(v * 255)
    a = feather(a, 10)
    im.putalpha(a)
    return im


for name, region in {
    "sprig-a": (395, 8, 742, 385),
    "sprig-b": (72, 268, 372, 700),
    "sprig-c": (495, 688, 808, 990),
    "sprig-d": (92, 898, 348, 1122),
}.items():
    save_webp(key_sprig(region), OUT / f"{name}.webp")

# ---------------------------------------------------------------- share card (no date or venue)
og = Image.new("RGB", (1200, 630), (251, 250, 245))
band = chin.crop((0, 300, 860, 752)).resize((1200, 630))
og.paste(band, (0, 0))
veil = Image.new("RGBA", (1200, 630), (251, 250, 245, 150))
og = Image.alpha_composite(og.convert("RGBA"), veil).convert("RGB")
og.save(ROOT / "public" / "og.jpg", "JPEG", quality=84, optimize=True, progressive=True)
print("  public/og.jpg")
