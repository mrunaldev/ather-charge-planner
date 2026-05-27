#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

osascript -l JavaScript "$ROOT_DIR/tests/app.test.js"
python3 "$ROOT_DIR/tests/static.test.py"
