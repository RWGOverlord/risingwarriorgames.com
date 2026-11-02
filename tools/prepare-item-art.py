#!/usr/bin/env python3
"""
Turns the BackerKit product exports into the masters the site expects.

The exports arrive with spaces in their names and, in the playmats' case, a
white label band across the bottom ("Night 1", "Board Playmat"). The order
panel already names each item in text beside the picture, so the band is
duplicated information and a white stripe through an otherwise dark
thumbnail. This crops it off.

The crop line is found rather than hardcoded: scanning down from 60% height,
the first row that is light all the way across is the top of the band. On the
current exports that lands at y=865 of 1076 for all five mats, which gives
1482x865, a ratio of 1.7133 against the real 24x14 inch mat's 1.7143. The
detection matters if the mats are ever re-exported at another size.

Sources are not modified. Re-run it after dropping in new exports, then run
tools/build-images.sh to regenerate images/opt/.

Usage:  python3 tools/prepare-item-art.py
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("This needs Pillow:  python3 -m pip install --user Pillow")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMAGES = os.path.join(ROOT, "images")

# Playmats: crop the label band off the bottom.
CROP = {
    "Night 1 xs - labeled.png": "Mat_Night_1.png",
    "Night 2 xs - labeled.png": "Mat_Night_2.png",
    "Night 3 xs - labeled.png": "Mat_Night_3.png",
    "Night 4 xs - labeled.png": "Mat_Night_4.png",
    "Board Playmat - labeled.png": "Mat_Board.png",
}

# Edition shots: trim the white surround so the product fills its frame.
#
# The order panel fits these with object-fit:contain, because the three are
# different shapes and cropping to a common frame would cut product out of
# the picture. Contain means the white surround baked into a master shrinks
# the product on the card, and the surrounds differ wildly: the Core shot is
# 56% empty width, the Horde shot 25%, the Overlord shot 9%. Trimming them
# all to content makes the three cards show products at a matching size.
#
# Gold_Trim_Thematic_MockUp also carries a 5px black frame, which a contain
# fit shows as a stray rectangle where the old cover fit cropped it away.
# FRAME below is ignored when looking for content, so the trim removes it.
#
# The originals are left alone: they are still the og:image and the artwork
# in other sections. These are separate, prepared masters.
TRIM = {
    "Gold_Trim_Thematic_MockUp.png": "Core_Edition.png",
    "Horde_Bundle.png": "Horde_Edition.png",
    "Overlord Bundle - Post KS.png": "Overlord_Bundle.png",
}

LIGHT = 250   # a pixel this bright counts as part of the label band
EDGE = 4      # ignore the hairline frame down each side
FRAME = 8     # px of printed border to ignore when looking for content
PAD = 0.02    # breathing room left around a trimmed product, share of width
LONG_EDGE = 1600  # cap on a prepared master; the widest derivative is 700


def on_white(im):
    """Flatten onto white so the alpha channel cannot read as black."""
    im = im.convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, im).convert("RGB")


def label_top(im):
    """First row of the bottom label band, or None if there is no band."""
    w, h = im.size
    px = on_white(im).convert("L").load()
    for y in range(int(h * 0.6), h):
        if all(px[x, y] >= LIGHT for x in range(EDGE, w - EDGE, 5)):
            return y
    return None


def content_box(im):
    """Bounding box of the product, ignoring a printed border and white."""
    w, h = im.size
    inner = on_white(im).crop((FRAME, FRAME, w - FRAME, h - FRAME))
    mask = inner.convert("L").point(lambda p: 0 if p >= 247 else 255)
    bb = mask.getbbox()
    if not bb:
        return None
    pad = int(w * PAD)
    return (max(0, bb[0] + FRAME - pad), max(0, bb[1] + FRAME - pad),
            min(w, bb[2] + FRAME + pad), min(h, bb[3] + FRAME + pad))


def main():
    missing = []
    wrote = 0

    for src_name, out_name in CROP.items():
        src = os.path.join(IMAGES, src_name)
        if not os.path.isfile(src):
            missing.append(src_name)
            continue
        im = Image.open(src)
        w, h = im.size
        cut = label_top(im)
        if cut is None:
            print("  !! %s: no label band found, copying whole" % src_name)
            cut = h
        out = os.path.join(IMAGES, out_name)
        im.crop((0, 0, w, cut)).save(out)
        print("  %-30s -> %-20s %dx%d (was %dx%d, ratio %.4f)"
              % (src_name, out_name, w, cut, w, h, w / cut))
        wrote += 1

    for src_name, out_name in TRIM.items():
        src = os.path.join(IMAGES, src_name)
        if not os.path.isfile(src):
            missing.append(src_name)
            continue
        im = Image.open(src)
        w, h = im.size
        bb = content_box(im)
        if bb is None:
            print("  !! %s: no content found, skipped" % src_name)
            continue
        out_im = on_white(im).crop(bb)
        ow, oh = out_im.size
        if max(ow, oh) > LONG_EDGE:
            scale = LONG_EDGE / float(max(ow, oh))
            out_im = out_im.resize((int(ow * scale), int(oh * scale)), Image.LANCZOS)
        fw, fh = out_im.size
        out_im.save(os.path.join(IMAGES, out_name))
        print("  %-30s -> %-20s %dx%d trimmed from %dx%d, ratio %.3f"
              % (src_name, out_name, fw, fh, w, h, fw / float(fh)))
        wrote += 1

    for m in missing:
        print("  -- not present, skipped: %s" % m)

    print("\n%d master(s) written. Now run:  bash tools/build-images.sh" % wrote)


if __name__ == "__main__":
    main()
