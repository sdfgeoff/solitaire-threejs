#!/usr/bin/env python3
"""Generate card face textures as PNG files for the solitaire game."""

import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = "src/assets/cards"
CARD_W, CARD_H = 180, 252
BG_COLOR = (0xFF, 0xFF, 0xF8)
BORDER_COLOR = (0xCC, 0xCC, 0xCC)

SUIT_SYMBOLS = {'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠'}
SUIT_COLORS = {'hearts': (0xD4, 0x00, 0x00), 'diamonds': (0xD4, 0x00, 0x00),
               'clubs': (0x1A, 0x1A, 0x1A), 'spades': (0x1A, 0x1A, 0x1A)}
RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

FACE_CARDS = {
    'J': 'JACK', 'Q': 'QUEEN', 'K': 'KING'
}

# Font sizes
BIG_FONT = 52
SMALL_FONT = 22
FACE_FONT = 14


def _find_font(size: int) -> ImageFont.FreeTypeFont:
    """Find a readable font for the given size."""
    candidates = [
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    # Fallback
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except OSError:
        return ImageFont.load_default()


def _draw_pip_circle(draw: ImageDraw.ImageDraw, color: tuple, cx: float, cy: float, r: float = 7):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def _draw_suit(draw: ImageDraw.ImageDraw, suit: str, color: tuple, cx: float, cy: float, size: int = BIG_FONT):
    font = _find_font(size)
    sym = SUIT_SYMBOLS[suit]
    bbox = draw.textbbox((0, 0), sym, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw / 2, cy - th / 2), sym, fill=color, font=font)


def _pip_layout(rank_idx: int, suit: str, color: tuple, draw: ImageDraw.ImageDraw, w: int, h: int):
    """Draw pips in standard positions."""
    margin_x = 36
    margin_y = 44
    play_w = w - 2 * margin_x
    play_h = h - 2 * margin_y

    positions = []
    if rank_idx == 0:  # Ace - big center suit
        _draw_suit(draw, suit, color, w / 2, h / 2, size=80)
        return

    if rank_idx <= 4:
        face = False
    else:
        face = True

    if not face:
        # Non-face cards: layout pips
        n = rank_idx
        if n == 1:  # 2
            positions = [(0.5, 0.30), (0.5, 0.70)]
        elif n == 2:  # 3
            positions = [(0.5, 0.25), (0.5, 0.50), (0.5, 0.75)]
        elif n == 3:  # 4
            positions = [(0.30, 0.25), (0.70, 0.25), (0.30, 0.75), (0.70, 0.75)]
        elif n == 4:  # 5
            positions = [(0.30, 0.25), (0.70, 0.25), (0.50, 0.50), (0.30, 0.75), (0.70, 0.75)]
        elif n == 5:  # 6
            positions = [(0.30, 0.20), (0.70, 0.20), (0.30, 0.50), (0.70, 0.50), (0.30, 0.80), (0.70, 0.80)]
        elif n == 6:  # 7
            positions = [(0.30, 0.18), (0.70, 0.18), (0.30, 0.40), (0.70, 0.40), (0.50, 0.50), (0.30, 0.82), (0.70, 0.82)]
        elif n == 7:  # 8
            positions = [(0.30, 0.18), (0.70, 0.18), (0.30, 0.40), (0.70, 0.40), (0.30, 0.50), (0.70, 0.50), (0.30, 0.82), (0.70, 0.82)]
        elif n == 8:  # 9
            positions = [(0.30, 0.15), (0.70, 0.15), (0.30, 0.37), (0.70, 0.37), (0.50, 0.50), (0.30, 0.63), (0.70, 0.63), (0.30, 0.85), (0.70, 0.85)]
        elif n == 9:  # 10
            positions = [(0.30, 0.13), (0.70, 0.13), (0.30, 0.33), (0.70, 0.33), (0.30, 0.47), (0.70, 0.47), (0.30, 0.53), (0.70, 0.53), (0.30, 0.67), (0.70, 0.67)]

        for px, py in positions:
            cx, cy = margin_x + px * play_w, margin_y + py * play_h
            # Flip suit for bottom row on odd-pip cards (3, 7, 9)
            if n in (2, 6, 8) and py > 0.5:
                _draw_suit(draw, suit, color, cx, cy, size=BIG_FONT)
            else:
                _draw_suit(draw, suit, color, cx, cy, size=BIG_FONT)
    else:
        # Face cards: draw a large decorative letter
        rank = RANKS[rank_idx]
        font = _find_font(64)
        letter = rank
        bbox = draw.textbbox((0, 0), letter, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((w / 2 - tw / 2, h / 2 - th / 2 - 10), letter, fill=color, font=font)

        # Decorative border inside
        inner_margin = 20
        draw.rounded_rectangle(
            [inner_margin, inner_margin, w - inner_margin, h - inner_margin],
            radius=8, outline=color, width=2
        )

        # Draw small crown/decoration above and below king/queen/jack
        small_font = _find_font(16)
        deco = SUIT_SYMBOLS[suit]
        db = draw.textbbox((0, 0), deco, font=small_font)
        dw, dh = db[2] - db[0], db[3] - db[1]
        draw.text((w / 2 - dw / 2, 28), deco, fill=color, font=small_font)
        draw.text((w / 2 - dw / 2, h - 28 - dh), deco, fill=color, font=small_font)


def generate_card(rank: str, suit: str) -> Image.Image:
    img = Image.new('RGBA', (CARD_W, CARD_H), (*BG_COLOR, 255))
    draw = ImageDraw.Draw(img)
    color = SUIT_COLORS[suit]
    rank_idx = RANKS.index(rank)

    # Rounded border
    draw.rounded_rectangle([0, 0, CARD_W - 1, CARD_H - 1], radius=10, outline=BORDER_COLOR, width=2)

    # Corner rank+suit
    small_font = _find_font(SMALL_FONT)
    big_font = _find_font(BIG_FONT)

    rank_text = rank
    suit_sym = SUIT_SYMBOLS[suit]

    # Top-left
    rb = draw.textbbox((0, 0), rank_text, font=small_font)
    rw = rb[2] - rb[0]
    draw.text((14, 14), rank_text, fill=color, font=small_font)

    sb = draw.textbbox((0, 0), suit_sym, font=big_font)
    sw, sh = sb[2] - sb[0], sb[3] - sb[1]
    draw.text((14 + (rw - sw) / 2, 38), suit_sym, fill=color, font=big_font)

    # Bottom-right (rotated 180)
    rb2 = draw.textbbox((0, 0), rank_text, font=small_font)
    rw2 = rb2[2] - rb2[0]
    draw.text((CARD_W - 14 - rw2, CARD_H - 34 - SMALL_FONT + 4), rank_text, fill=color, font=small_font)

    sb2 = draw.textbbox((0, 0), suit_sym, font=big_font)
    sw2, sh2 = sb2[2] - sb2[0], sb2[3] - sb2[1]
    draw.text((CARD_W - 14 - rw2 + (rw2 - sw2) / 2, CARD_H - 34 - sh2 - 4), suit_sym, fill=color, font=big_font)

    # Center pips/face art
    _pip_layout(rank_idx, suit, color, draw, CARD_W, CARD_H)

    return img


def generate_back() -> Image.Image:
    img = Image.new('RGBA', (CARD_W, CARD_H), (*BG_COLOR, 255))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, CARD_W - 1, CARD_H - 1], radius=10, outline=BORDER_COLOR, width=2)

    # Blue pattern
    pattern_color = (0x1A, 0x3C, 0x6E)
    inner = 16
    draw.rounded_rectangle([inner, inner, CARD_W - inner, CARD_H - inner], radius=6, fill=pattern_color)

    # Inner lighter border
    inner2 = 22
    draw.rounded_rectangle([inner2, inner2, CARD_W - inner2, CARD_H - inner2], radius=4, outline=(0x2A, 0x5C, 0x9E), width=2)

    # Diamond pattern
    cx, cy = CARD_W / 2, CARD_H / 2
    pts = [(cx, 40), (CARD_W - 50, cy), (cx, CARD_H - 40), (50, cy)]
    draw.polygon(pts, outline=(0x3A, 0x7C, 0xBE), width=2)

    return img


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generate all cards
    for suit in SUIT_SYMBOLS:
        for rank in RANKS:
            img = generate_card(rank, suit)
            fname = f"{rank}_{suit}.png"
            img.save(os.path.join(OUTPUT_DIR, fname))
            print(f"  {fname}")

    # Generate back
    back = generate_back()
    back.save(os.path.join(OUTPUT_DIR, "back.png"))
    print("  back.png")

    print(f"\nGenerated {len(RANKS) * len(SUIT_SYMBOLS) + 1} card textures in {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
