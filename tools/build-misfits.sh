#!/bin/bash
#
# Builds the card images for /misfits/ from the manufacturer print files.
#
# The print files carry bleed around the 63 x 88 mm trim. This script works
# out the bleed from each file's own pixel size, crops it off evenly, converts
# CMYK to sRGB (browsers render CMYK JPEGs inconsistently) and writes JPEGs at
# the two widths the page requests.
#
# How the bleed is found: with equal bleed b on every side, the file is
# (63+2b) x (88+2b) mm, so height minus width is always 25 mm whatever b is.
# That gives pixels-per-mm, and from it the trim size. Each card's derived
# bleed is printed so you can sanity-check it (3 mm, or 3.175 mm for 1/8 in,
# is typical). To force a value instead:  BLEED_MM=3 bash tools/build-misfits.sh ...
#
# The print masters are NOT committed (they are large and CMYK). Put them in
# any folder, named to match the page:
#
#   base-<slug>.jpg|png    the base-game card to remove, e.g. base-bird-watcher.png
#   add-<slug>.jpg|png     the Misfits card to add,      e.g. add-rooster.png
#
# <slug> is the card name in lower case with dashes. Run with no arguments to
# list every expected filename.
#
# Usage:  bash tools/build-misfits.sh /path/to/print-files

set -euo pipefail

cd "$(dirname "$0")/.."
OUT="images/misfits"
WIDTHS=(240 480)
JPEG_QUALITY=82
SRGB="/System/Library/ColorSync/Profiles/sRGB Profile.icc"

if [ $# -lt 1 ]; then
  echo "usage: bash tools/build-misfits.sh /path/to/print-files"
  echo
  echo "expected files (any of .jpg .jpeg .png .tif):"
  grep -o '/images/misfits/\(base\|add\)-[a-z0-9-]*-240\.jpg' misfits/index.html |
    sed 's|/images/misfits/||; s|-240\.jpg$||' | sort -u | sed 's/^/  /'
  exit 1
fi

SRC="$1"
mkdir -p "$OUT"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

found=0
for src in "$SRC"/base-* "$SRC"/add-*; do
  [ -f "$src" ] || continue
  name=$(basename "$src")
  base="${name%.*}"

  w=$(sips -g pixelWidth  "$src" | awk -F': ' '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$src" | awk -F': ' '/pixelHeight/{print $2}')

  if [ -n "${BLEED_MM:-}" ]; then
    ppmm=$(echo "scale=6; $w / (63 + 2*$BLEED_MM)" | bc)
  else
    ppmm=$(echo "scale=6; ($h - $w) / 25" | bc)
  fi
  tw=$(printf '%.0f' "$(echo "$ppmm * 63" | bc)")
  th=$(printf '%.0f' "$(echo "$ppmm * 88" | bc)")
  bleed=$(echo "scale=2; ($w / $ppmm - 63) / 2" | bc)

  # A negative or very large bleed means the file is not a portrait
  # 63 x 88 card with even bleed. Skip it rather than crop it wrong.
  if [ "$tw" -le 0 ] || [ "$tw" -gt "$w" ] || [ "$th" -gt "$h" ] || [ "$(echo "$bleed > 6" | bc)" = 1 ]; then
    printf '  !! %-28s %sx%s, derived bleed %s mm: skipped, check the file\n' "$name" "$w" "$h" "$bleed" >&2
    continue
  fi

  trimmed="$TMP/$base.jpg"
  sips --cropToHeightWidth "$th" "$tw" --matchTo "$SRGB" \
    -s format jpeg -s formatOptions 95 "$src" --out "$trimmed" >/dev/null

  for wd in "${WIDTHS[@]}"; do
    sips --resampleWidth "$wd" -s format jpeg -s formatOptions "$JPEG_QUALITY" \
      "$trimmed" --out "$OUT/$base-$wd.jpg" >/dev/null
  done
  found=$((found + 1))
  printf '  %-28s %sx%s  bleed %4s mm  ->  trim %sx%s\n' "$name" "$w" "$h" "$bleed" "$tw" "$th"
done

echo
echo "$found card files processed into $OUT/"

# Report anything the page asks for that is still missing.
missing=$(grep -o '/images/misfits/[a-z0-9-]*-240\.jpg' misfits/index.html | sort -u |
  while read -r p; do [ -f ".$p" ] || echo "  ${p#/images/misfits/}"; done)
if [ -n "$missing" ]; then
  echo
  echo "still missing:"
  echo "$missing"
fi
