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
echo "🤖 GitHub Actions deployt automatisch naar cPanel via FTP."
echo "   Status volgen: https://github.com/Damir501/finaforte-masterplan-landingpage/actions"
echo ""
echo "🌍 Live site (binnen ±1 minuut): https://masterplan.finaforte.nl/"
