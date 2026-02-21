#!/bin/bash
# =============================================================
# Image & Video Optimization Script
# Converts JPG/PNG to WebP, resizes large images, compresses video
# Requires: cwebp (libwebp), ffmpeg, imagemagick (optional)
# Install: brew install webp ffmpeg  (macOS)
#          sudo apt install webp ffmpeg  (Ubuntu/Debian)
# =============================================================

set -e

QUALITY=80
MAX_WIDTH=1920
VIDEO_CRF=28
MIN_SIZE_KB=500

echo "🔍 Scanning for images > ${MIN_SIZE_KB}KB..."
echo ""

# --- 1. Convert public/ JPGs to WebP (side-by-side) ---
echo "=== Phase 1: public/ → WebP ==="
find public -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r img; do
  size_kb=$(( $(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null) / 1024 ))
  webp_path="${img%.*}.webp"

  if [ "$size_kb" -ge "$MIN_SIZE_KB" ]; then
    echo "  [${size_kb}KB] $img"
    if [ ! -f "$webp_path" ]; then
      cwebp -q $QUALITY -resize $MAX_WIDTH 0 "$img" -o "$webp_path" 2>/dev/null && \
        echo "    ✅ Created $webp_path ($(( $(stat -f%z "$webp_path" 2>/dev/null || stat -c%s "$webp_path" 2>/dev/null) / 1024 ))KB)"
    else
      echo "    ⏭️  WebP already exists"
    fi
  fi
done
echo ""

# --- 2. Convert src/assets/ JPGs to WebP (replace original) ---
echo "=== Phase 2: src/assets/ → WebP (in-place) ==="
echo "⚠️  This replaces JPGs with WebPs. Update imports after running!"
echo "   Press Ctrl+C to skip, or Enter to continue..."
read -r

find src/assets -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r img; do
  size_kb=$(( $(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null) / 1024 ))
  webp_path="${img%.*}.webp"

  echo "  [${size_kb}KB] $img"
  cwebp -q $QUALITY -resize $MAX_WIDTH 0 "$img" -o "$webp_path" 2>/dev/null && \
    echo "    ✅ Created $webp_path ($(( $(stat -f%z "$webp_path" 2>/dev/null || stat -c%s "$webp_path" 2>/dev/null) / 1024 ))KB)"
done
echo ""

# --- 3. Compress hero video ---
echo "=== Phase 3: Video compression ==="
if [ -f "public/hero-video.mp4" ]; then
  size_kb=$(( $(stat -f%z "public/hero-video.mp4" 2>/dev/null || stat -c%s "public/hero-video.mp4" 2>/dev/null) / 1024 ))
  echo "  [${size_kb}KB] public/hero-video.mp4"

  if [ "$size_kb" -ge "$MIN_SIZE_KB" ]; then
    ffmpeg -i public/hero-video.mp4 \
      -c:v libx264 -crf $VIDEO_CRF -preset slow \
      -vf "scale='min(1280,iw)':-2" \
      -c:a aac -b:a 128k \
      -movflags +faststart \
      -y public/hero-video-optimized.mp4 2>/dev/null && \
    echo "    ✅ Created hero-video-optimized.mp4 ($(( $(stat -f%z "public/hero-video-optimized.mp4" 2>/dev/null || stat -c%s "public/hero-video-optimized.mp4" 2>/dev/null) / 1024 ))KB)"
    echo "    → Rename manually: mv public/hero-video-optimized.mp4 public/hero-video.mp4"
  fi
else
  echo "  No hero video found"
fi
echo ""

# --- 4. Summary report ---
echo "=== Summary ==="
echo "WebP files in public/:"
find public -name "*.webp" 2>/dev/null | wc -l | xargs echo "  "
echo "WebP files in src/assets/:"
find src/assets -name "*.webp" 2>/dev/null | wc -l | xargs echo "  "
echo ""
echo "🎉 Done! For src/assets WebPs, update your imports:"
echo '   import img from "@/assets/blog/example.webp"  (was .jpg)'
echo ""
echo "For public/ WebPs, no code changes needed —"
echo "OptimizedImage already serves them via <picture> tags."
