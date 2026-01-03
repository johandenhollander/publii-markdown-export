#!/bin/bash
# Build distribution ZIP for Publii plugin
# Publii expects: pluginName/main.js, plugin.json, thumbnail.svg, LICENSE

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=$(grep -o '"version": "[^"]*"' plugin.json | cut -d'"' -f4)
PLUGIN_DIR="markdownExport"
OUTPUT_FILE="publii-markdown-export_${VERSION}.zip"
OUTPUT_PATH="$SCRIPT_DIR/$OUTPUT_FILE"

echo "Building ${PLUGIN_DIR} v${VERSION}..."

# Remove old zip if exists
rm -f "$OUTPUT_PATH"

# Create temp directory with plugin structure
TEMP_DIR=$(mktemp -d)
mkdir -p "$TEMP_DIR/$PLUGIN_DIR"

# Copy required files
cp main.js plugin.json thumbnail.svg LICENSE "$TEMP_DIR/$PLUGIN_DIR/"

# Create zip
cd "$TEMP_DIR"
zip -r "$OUTPUT_PATH" "$PLUGIN_DIR"
cd "$SCRIPT_DIR"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✓ Created: $OUTPUT_FILE"
echo ""
unzip -l "$OUTPUT_PATH"
