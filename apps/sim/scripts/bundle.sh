#!/usr/bin/env bash
set -euo pipefail

# Add local user bins to path
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"

# Determine Rust target triple
if ! command -v rustc &> /dev/null; then
    echo "Error: rustc is not in PATH" >&2
    exit 1
fi

TRIPLE=$(rustc -Vv | grep host | cut -d' ' -f2)
echo "Detected target triple: $TRIPLE"

# Build executable via PyInstaller
echo "Running PyInstaller..."
uv run pyinstaller --clean --onefile --name planet-sim sim/main.py

# Copy compiled binary to tauri binaries dir
BINARIES_DIR="../web/src-tauri/binaries"
mkdir -p "$BINARIES_DIR"

# Check if windows or unix
if [[ "$TRIPLE" == *"windows"* ]]; then
    if [ -f dist/planet-sim.exe ]; then
        cp dist/planet-sim.exe "$BINARIES_DIR/planet-sim-$TRIPLE.exe"
        echo "Copied dist/planet-sim.exe to $BINARIES_DIR/planet-sim-$TRIPLE.exe"
    else
        echo "Error: Compiled binary not found at dist/planet-sim.exe" >&2
        exit 1
    fi
else
    if [ -f dist/planet-sim ]; then
        cp dist/planet-sim "$BINARIES_DIR/planet-sim-$TRIPLE"
        echo "Copied dist/planet-sim to $BINARIES_DIR/planet-sim-$TRIPLE"
    else
        echo "Error: Compiled binary not found at dist/planet-sim" >&2
        exit 1
    fi
fi

echo "Sidecar bundling complete!"
