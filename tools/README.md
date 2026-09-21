# tools

## build-images.sh
Regenerates the responsive image derivatives in `images/opt/` from the masters
in `images/`. Widths come from the CSS slot each image occupies, at 1x and 2x.
Masters are never modified.

    bash tools/build-images.sh

## Rulebook PDF

The rulebook masters live in Google Drive and are not in this repo. Both source
versions are page images with **no embedded text** — 150 dpi (41 MB, too heavy
to serve) and 75 dpi (9.7 MB, page images only 584 px, hard to read).

`rulebook.pdf` at the site root is generated from the 150 dpi master: each page
is re-rendered at 1500 px and embedded as a JPEG. 6.2 MB, and sharper than the
75 dpi version at two thirds the size.

To rebuild from a new master:

    swiftc -O tools/renderpdf.swift -o /tmp/renderpdf
    /tmp/renderpdf master.pdf /tmp/pages 1500 0.52
    python3 tools/buildpdf.py /tmp/pages rulebook.pdf 1217 1216

The last two arguments are the source MediaBox in points. `renderpdf` prints the
rendered page size; `buildpdf.py` embeds the JPEGs as DCTDecode streams, which
CoreGraphics will not do on its own (it re-encodes to Flate, which is much
larger for this artwork).

If the rulebook is ever re-exported **with real text**, use that directly
instead — it would be accessible to screen readers and indexable by Google,
which no image-only version can be.

## Rules page diagrams

`images/rules/p*.jpg` are page renders from the 150 dpi rulebook master, used as
figures on `rules.html`. Regenerate with `tools/renderpdf.swift`, then downsize:

    /tmp/renderpdf master.pdf /tmp/pages 2000 0.85
    for p in 03 04 06 08 09 10 12 13 14 15 16 17; do
      for w in 700 1200; do
        sips --resampleWidth $w -s format jpeg -s formatOptions 78 \
          /tmp/pages/p$p.jpg --out images/rules/p$p-$w.jpg
      done
    done

`tools/ocr.swift` OCRs those renders via the macOS Vision framework — that is how
the text on `rules.html` was recovered, since the master carries no text layer.
