#!/usr/bin/env python3
"""Generate 404 Pets icons (16/48/128) as PNGs using only the stdlib."""
import os, struct, zlib

# 16x16 pixel-art cat face
# . transparent  O body  S stripe  W white  P pink  E eye
ART = [
    "................",
    "..OO........OO..",
    "..OPO......OPO..",
    "..OOOOOOOOOOOO..",
    ".OOOOOOOOOOOOOO.",
    ".OOSOOOOOOOOSOO.",
    ".OOOOOOOOOOOOOO.",
    ".OOEEOOOOOOEEOO.",
    ".OOEEOOOOOOEEOO.",
    ".OOOOOWWWWOOOOO.",
    ".OOOOOWPPWOOOOO.",
    "..OOOOWWWWOOOO..",
    "..OOOOOOOOOOOO..",
    "...OOOOOOOOOO...",
    "................",
    "................",
]

COLORS = {
    "O": (245, 165, 74, 255),
    "S": (217, 130, 43, 255),
    "W": (255, 246, 232, 255),
    "P": (240, 140, 164, 255),
    "E": (51, 38, 31, 255),
    ".": (0, 0, 0, 0),
}

def write_png(path, size):
    scale = size // 16
    raw = b""
    for y in range(size):
        row = b"\x00"  # filter: none
        for x in range(size):
            c = COLORS[ART[y // scale][x // scale]]
            row += bytes(c)
        raw += row

    def chunk(tag, data):
        out = struct.pack(">I", len(data)) + tag + data
        return out + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({size}x{size})")

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
os.makedirs(out, exist_ok=True)
for s in (16, 48, 128):
    write_png(f"{out}/icon{s}.png", s)
