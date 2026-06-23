#!/bin/bash
# ============================================================
# github-setup.sh — einmalig ausführen um das Repo zu GitHub zu pushen
# Voraussetzung: gh CLI installiert (brew install gh) + eingeloggt (gh auth login)
# ============================================================

set -e

COMPONENT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📁 Verzeichnis: $COMPONENT_DIR"
cd "$COMPONENT_DIR"

# .git entfernen falls von vorherigem Versuch übrig
if [ -d ".git" ]; then
  echo "🧹 Altes .git entfernen..."
  rm -rf .git
fi

# Frisches git init
git init
git config user.email "richardseltenreich@mail.ch"
git config user.name "Richard Seltenreich"

# Nur Quelldateien hinzufügen (node_modules via .gitignore ausgeschlossen)
git add .gitignore package.json ww-config.js src/wwElement.vue dist/manager.js

git commit -m "feat: Referral-Dashboard mit Code-Anzeige, Copy-Link und Stats

- ensure_referral_code() RPC für persönlichen Code
- Empfehlungs-Link mit Copy-to-Clipboard (navigator.clipboard + execCommand-Fallback)
- Stats aus referrals-Tabelle (graceful degraded falls RLS kein Zugriff)
- Design-System hr-am-tisch (hrk-* tokens + Responsive)
- fetchWithTimeout 10s AbortController
- Auth-/Lade-Error-States + Editor-Preview-Modus"

# GitHub Repo erstellen und pushen
gh repo create Monasterio807/weweb-referral-dashboard \
  --public \
  --source=. \
  --remote=origin \
  --push \
  --description "WeWeb Coded Component – Referral-Dashboard (HRklar)"

echo ""
echo "✅ Fertig! Repo live unter:"
echo "   https://github.com/Monasterio807/weweb-referral-dashboard"
