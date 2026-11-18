#!/bin/sh
# Regenerates files.json (every script/style the game loads) — used by index.html's self-heal on stale caches.
cd "$(dirname "$0")/.." && find js css -type f \( -name '*.js' -o -name '*.css' \) | sort | python3 -c "import sys,json;print(json.dumps([l.strip() for l in sys.stdin]+['index.html','assets/icons.json','assets/icons.png','assets/enemies.png']))" > files.json
