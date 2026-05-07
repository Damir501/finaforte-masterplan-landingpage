#!/bin/bash
# dev.sh — start een lokale preview van de website
# Gebruik: ./dev.sh
# Daarna: open http://localhost:8000 in je browser

cd "$(dirname "$0")"

PORT=8000

# Probeer een vrije poort te vinden als 8000 bezet is
while lsof -i:$PORT >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

echo ""
echo "🌐 Lokale preview gestart"
echo "   👉 Open in browser: http://localhost:$PORT"
echo ""
echo "   Druk Ctrl+C om te stoppen."
echo ""

python3 -m http.server $PORT
