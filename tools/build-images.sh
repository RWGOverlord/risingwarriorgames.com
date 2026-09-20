#!/bin/bash
#
# Generates the responsive image derivatives referenced by the site.
#
# Source masters live in images/ and are never modified. Output goes to
# images/opt/ as <basename>-<width>.<ext> and is safe to delete and rebuild.
#
# Uses only sips (macOS built-in), so PNG masters stay PNG and JPEG masters
# stay JPEG. Widths come from the CSS slot each image occupies, at 1x and 2x;
# see the table in tools/README.md.
#
# Usage:  bash tools/build-images.sh

set -euo pipefail

cd "$(dirname "$0")/.."
SRC="images"
OUT="images/opt"
JPEG_QUALITY=82

mkdir -p "$OUT"

# "<file>[>jpg]  <width> <width> ..."  — widths the site actually requests.
#
# A ">jpg" marker forces a PNG master to JPEG. Only used for art that is
# verified full-bleed (its own background fills the frame), so there is no
# transparency to lose. Every other PNG keeps its alpha — the product
# mockups, card fans and logos all sit on tinted panels and need it.
TARGETS=(
  # header / footer marks
  "RWG_Name_Logo.png            180 270"
  "RISING_LOGO_VECTOR.png       220 440"

  # index hero + game card
  "Full_Layout_1.jpg            300 520 560 760 1000"
  "KS_Main_1x1.png>jpg          560 760 1000"

  # ZO hero
  "Zombie_Overlord_Title_Horizontal.png  560 760 1040"
  "Box_with_cards.jpg           560 760 1020"

  # ZO premise + pillars
  "Horde_Cover.png>jpg          560 760 1020"
  "Survivor_Cards.jpg           560 760 1020"
  "Trap_Cards.jpg               560 760 1020"
  "Unique_Survivor_Horde.png>jpg  560 760 1020"

  # ZO gallery (4-up desktop, 2-up mobile)
  "Action_Cards.png             300 520"
  "Survivors_Grouped.png        300 520"
  "layout_2.jpg                 300 520"

  # editions (3-up desktop, 1-up mobile)
  "Gold_Trim_Thematic_MockUp.png  400 700"
  "Premium_Product.png           400 700"
  "Battlefield_Product.png       400 700"

  # add-ons (3-up desktop, 1-up mobile)
  "mini_expansion.png           360 620"
  "Playmats.png                 360 620"
  "Trackers_Addon.png           360 620"

  # playthrough poster
  "ZO_Playthrough_Poster.jpg    640 1280"

  # og:image / twitter:image — flattened to JPEG because several social
  # scrapers composite PNG alpha onto black
  "Gold_Trim_Thematic_MockUp.png>jpg  1200"
  "Premium_Product.png>jpg            1200"
)

srcbytes=0
outbytes=0

for row in "${TARGETS[@]}"; do
  # shellcheck disable=SC2206
  parts=($row)
  spec="${parts[0]}"
  widths=("${parts[@]:1}")

  # split the optional ">jpg" format override off the filename
  file="${spec%%>*}"
  force=""
  [ "$spec" != "$file" ] && force="${spec##*>}"

  src="$SRC/$file"

  if [ ! -f "$src" ]; then
    echo "  !! missing master: $src" >&2
    continue
  fi

  base="${file%.*}"
  ext="${file##*.}"
  [ -n "$force" ] && ext="$force"
  srcw=$(sips -g pixelWidth "$src" | awk -F': ' '/pixelWidth/{print $2}')
  srcbytes=$((srcbytes + $(stat -f %z "$src")))

  for w in "${widths[@]}"; do
    # never upscale past the master
    if [ "$w" -gt "$srcw" ]; then
      echo "  -- $file: skipping ${w}w (master is only ${srcw}w)"
      continue
    fi

    dest="$OUT/$base-$w.$ext"

    if [ "$ext" = "jpg" ] || [ "$ext" = "jpeg" ]; then
      sips --resampleWidth "$w" -s format jpeg -s formatOptions "$JPEG_QUALITY" \
        "$src" --out "$dest" >/dev/null
    else
      sips --resampleWidth "$w" -s format png "$src" --out "$dest" >/dev/null
    fi

    outbytes=$((outbytes + $(stat -f %z "$dest")))
    printf "  %-44s %5sw  %7s\n" "$base-$w.$ext" "$w" "$(du -h "$dest" | cut -f1 | tr -d ' ')"
  done
done

echo
printf "masters:     %6.1f MB\n" "$(echo "scale=3; $srcbytes/1048576" | bc)"
printf "derivatives: %6.1f MB (all widths combined)\n" "$(echo "scale=3; $outbytes/1048576" | bc)"
