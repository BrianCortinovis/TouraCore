#!/bin/bash
# Installa TouraCore Secrets.app in ~/Applications con icona custom.
# Lancia automaticamente "pnpm secrets" in nuova finestra Terminale.
#
# Run: bash scripts/secrets/install-app.sh

set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$HOME/Applications/TouraCore Secrets.app"
ICON_SVG="$(mktemp -t touracore-icon).svg"
ICON_DIR="$(mktemp -d -t touracore-icons)"

echo "→ Installing to: $APP_DIR"

mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"

# launcher
cat > "$APP_DIR/Contents/MacOS/launcher" <<EOF
#!/bin/bash
osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "cd '$REPO' && clear && pnpm secrets"
end tell
APPLESCRIPT
EOF
chmod +x "$APP_DIR/Contents/MacOS/launcher"

# Info.plist
cat > "$APP_DIR/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>TouraCore Secrets</string>
  <key>CFBundleDisplayName</key><string>TouraCore Secrets</string>
  <key>CFBundleIdentifier</key><string>com.touracore.secrets-manager</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIconFile</key><string>icon.icns</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
EOF

# icon SVG (key on teal-sky gradient)
cat > "$ICON_SVG" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="50%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
    <linearGradient id="key" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="14"/>
      <feOffset dx="0" dy="10"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="64" y="64" width="896" height="896" rx="200" ry="200" fill="url(#bg)"/>
  <rect x="64" y="64" width="896" height="448" rx="200" ry="200" fill="white" opacity="0.08"/>
  <g filter="url(#shadow)" transform="translate(280 280) rotate(-30 232 232)">
    <rect x="200" y="160" width="280" height="44" rx="22" fill="url(#key)"/>
    <rect x="430" y="200" width="40" height="44" rx="6" fill="url(#key)"/>
    <rect x="380" y="200" width="32" height="36" rx="6" fill="url(#key)"/>
    <circle cx="170" cy="182" r="120" fill="url(#key)"/>
    <circle cx="170" cy="182" r="60" fill="#0f766e"/>
  </g>
</svg>
EOF

# Convert SVG → PNG → icns
if ! command -v magick >/dev/null 2>&1; then
  echo "✗ ImageMagick not found. Install: brew install imagemagick"
  exit 1
fi

magick -density 1024 -background none "$ICON_SVG" -resize 1024x1024 "$ICON_DIR/icon_1024.png" 2>/dev/null

mkdir -p "$ICON_DIR/icon.iconset"
for size in 16 32 64 128 256 512; do
  sips -z $size $size "$ICON_DIR/icon_1024.png" --out "$ICON_DIR/icon.iconset/icon_${size}x${size}.png" >/dev/null 2>&1
  sips -z $((size*2)) $((size*2)) "$ICON_DIR/icon_1024.png" --out "$ICON_DIR/icon.iconset/icon_${size}x${size}@2x.png" >/dev/null 2>&1
done
sips -z 1024 1024 "$ICON_DIR/icon_1024.png" --out "$ICON_DIR/icon.iconset/icon_512x512@2x.png" >/dev/null 2>&1

iconutil -c icns "$ICON_DIR/icon.iconset" -o "$APP_DIR/Contents/Resources/icon.icns"

# Refresh Finder cache
touch "$APP_DIR"
touch "$APP_DIR/Contents/Info.plist"

# Cleanup
rm -rf "$ICON_DIR" "$ICON_SVG"

echo ""
echo "✓ Installed!"
echo ""
echo "  Launch from:"
echo "  • Spotlight: Cmd+Space → 'TouraCore Secrets'"
echo "  • Finder: ~/Applications/TouraCore Secrets.app"
echo "  • Dock: drag the app from Finder to Dock"
echo ""
echo "  Or run directly: pnpm secrets"
