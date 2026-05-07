#!/bin/bash
# deploy.sh — push lokale wijzigingen naar GitHub (en daarmee naar live via cPanel)
# Gebruik: ./deploy.sh "optionele commit boodschap"

set -e

cd "$(dirname "$0")"

MSG="${1:-Update site $(date +%Y-%m-%d\ %H:%M)}"

echo "🔄 Deploying naar GitHub..."
echo ""

git add -A

if git diff --cached --quiet; then
    echo "ℹ️  Geen wijzigingen om te committen."
    echo "   (Wel pushen voor het geval er nog niet-gepushte commits zijn)"
else
    git commit -m "$MSG"
    echo "✅ Committed: $MSG"
fi

echo ""
echo "📤 Pushen naar GitHub..."
git push origin main

echo ""
echo "✅ Klaar! GitHub is bijgewerkt."
echo ""
echo "📡 Volgende stap (eenmalig handmatig, daarna automatisch via webhook):"
echo "   1. cPanel → Git Version Control"
echo "   2. Klik 'Update from Remote'"
echo "   3. Klik 'Deploy HEAD Commit'"
echo ""
echo "🌍 Live site: https://masterplan.finaforte.nl/"
