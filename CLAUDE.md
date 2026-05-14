# CLAUDE.md — Onboarding voor Claude-sessies

> Dit bestand wordt **automatisch gelezen** aan het begin van elke Claude Code sessie.
> Houd het beknopt en actueel. Voor sessie-historie zie `WORKLOG.md`.

---

## 🎯 Project in 1 zin

Lead-generatie landingpagina voor **Finaforte** (financieel advies voor DGA's), met 13 interactieve fiscale calculators + een scan-funnel die leidt naar een persoonlijk PDF-rapport en een Calendly-call.

- 🌍 **Live**: https://masterplan.finaforte.nl/
- 📦 **Repo**: https://github.com/Damir501/finaforte-masterplan-landingpage
- 👤 **Eigenaar**: Damir Tvrtkovic (Finaforte, sinds 2007)

---

## 🛠 Tech-stack (bewust simpel)

- **Vanilla HTML + CSS + JS** — geen framework, geen build-step
- **PHP** voor 3 API-endpoints (`api/`): Brevo-proxy + Calendly-webhook
- **Hosting**: cPanel (shared hosting) via FTP
- **CI**: GitHub Actions → FTPS sync naar `/public_html/` op push naar `main`
- **Analytics**: GoatCounter (pageview + custom events)
- **Email**: Brevo (transactionele mails + lead-capture)
- **Calls**: Calendly (met webhook → Brevo bevestigingsmail)

Geen `package.json`, geen `node_modules`. Bestanden zijn direct wat ze lijken.

---

## 📂 Structuur

```
.
├── index.html              # Homepage (hero, traject, review-carousel, "Over Damir")
├── masterplan/             # /masterplan/ — kern-product detailpagina
├── implementatie/          # /implementatie/ — uitvoering-fase + FAQ
├── rapport/                # /rapport/ — PDF-download-pagina (Funnel-Fase-B)
├── scan/                   # /scan/ — Q1-Q13 fiscale scan (Funnel-Fase-A)
├── tsolingkas/             # leadmagnet-variant
├── implementatie/          # diensten-detail
├── Mini-Calculators/       # 13 calculators (01_… t/m 13_…)
├── shared/                 # token-guard, pdf-generator, analytics, header-nav
│   ├── token-guard.js      # toegangs-modal (email-gate)
│   ├── pdf-generator.js    # jsPDF-rapport
│   ├── header-nav.js       # sticky header + mobile hamburger
│   ├── analytics-cta.js    # GoatCounter event-tagging op CTAs
│   └── scan-fingerprint.js # device-fingerprint voor scan
├── styles/
│   ├── tokens.css          # design-tokens (kleur, typografie, spacing)
│   └── base.css            # globale stijlen + editorial paper-look
├── api/
│   ├── brevo-scan-completion.php  # Brevo lead-capture proxy
│   ├── calendly-webhook.php       # Calendly → Brevo F5-bevestiging
│   └── test.php
├── .github/workflows/deploy.yml   # FTP sync naar cPanel
├── .cpanel.yml             # cPanel deploy fallback (push naar main)
├── deploy.sh               # ./deploy.sh "msg" → commit + push main
├── dev.sh                  # ./dev.sh → localhost:8000 preview
└── _legacy/                # oude bestanden, niet aanraken
```

---

## 🎨 Design-taal

**Editorial paper-look** (zoals een papieren rapport van een advies-kantoor):

- **Cream body-bg** met subtiele dot-grid achtergrond
- **Typografie**: Fraunces (serif, italic accenten) voor headings + lead-paragraphs; sans-serif voor body
- **Eyebrows** met flanking dashes: `— TITEL —`
- **Crop-marks** in viewport-hoeken (papier-print-vibe)
- **Compass-rose** SVG in hero
- **Multi-layer shadows** + micro-interactions
- **Sidebar-TOC** met IntersectionObserver scroll-spy (op pagina's met `body.has-toc`)

Alle stijlen via `styles/tokens.css` + `styles/base.css`. Mini-calculators linken naar globale tokens (sinds 13 mei `Niveau-D/4`).

---

## 🚀 Deploy-flow

```
LOKAAL → push naar main → GitHub Actions → FTPS → cPanel → live (±1 min)
```

- Werk op feature-branch (bijv. `claude/repo-exploration-tMNMG`)
- Wanneer iets af is: merge naar `main` → automatische deploy
- **Cache-busters** verplicht bij CSS/JS-wijziging: bump `?v=…` query-string in HTML-links (zie `git log --grep="cache-buster"`)
- Status van elke deploy: https://github.com/Damir501/finaforte-masterplan-landingpage/actions

---

## ✍️ Commit-conventies

Format: `type(scope/subscope): wat-en-waarom`

**Types** (consistent gebruikt in deze repo):
- `feat()` — nieuwe feature
- `fix()` — bugfix
- `style()` — visuele/CSS-wijziging zonder logica-impact
- `chore()` — onderhoud (cache-bumps, refactor, deps)

**Scopes** (gebruikelijk): `homepage`, `scan`, `rapport`, `masterplan`, `implementatie`, `analytics`, `seo`, `api`, `nav`, `footer`, `crosslink`, `cache`, `funnel-A/B/C`, of een **niveau-aanduiding** (`niveau-A` t/m `niveau-E`) voor design-iteraties.

**Subscopes**: voor work-in-progress met meerdere atomic commits → `niveau-D/3` betekent stap 3 van niveau-D.

**Voorbeelden uit git log:**
- `feat(homepage/2A): reviewcarousel met 6 anonieme persona-quotes`
- `style(niveau-C/3): eyebrow met flanking dashes (— TITEL —)`
- `chore(niveau-E/Fase-2): cache-buster bump ?v=i -> ?v=j op 18 files`

---

## 🌳 Branch-strategie — UNIFIED WORKFLOW (sinds 14 mei 2026)

**Eén branch: `main`.** Zowel mobiel als desktop-PC committen direct naar `main`.

```
PC (./deploy.sh) ─┐
                  ├──→ main ──→ GitHub Actions FTP ──→ cPanel live
Mobiel (Claude) ──┘
```

- ✅ **Geen feature-branches** (tenzij voor risicovol multi-step werk)
- ✅ **Bij elke sessie eerst**: `git pull origin main` om wijzigingen van het andere apparaat op te halen
- ✅ **Bij elke commit-cyclus**: commit → push naar `main` → auto-deploy naar live binnen ±1 min
- ⚠️ **Pas op**: `main` deployt direct live. Test eerst lokaal via `./dev.sh`

**Voor risicovol werk** (grote refactors, experimenten): maak ad-hoc een feature-branch, merge later. Default = direct op `main`.

Oude feature-branch `claude/repo-exploration-tMNMG` is gearchiveerd (niet meer actief gebruikt).

---

## 🧭 Funnel-overzicht (belangrijk voor context)

```
Landing (/) → Scan (/scan/) → Email-capture → Rapport (/rapport/) → PDF-download → Calendly-call
   F1            F-A              F-B            F-B                    F5
```

- **F1**: homepage → CTA naar scan
- **Funnel-Fase-A**: scan Q1-Q13 + email-capture → Brevo webhook
- **Funnel-Fase-B**: gepersonaliseerd 8-pag PDF-rapport (jsPDF)
- **Funnel-Fase-C**: Brevo scan-completion PHP-proxy (host-whitelist + header-injection guard)
- **F5**: Calendly-call boeking → Calendly-webhook → Brevo bevestigingsmail
- Naam in mail-rendering: **Damir Tvrtkovic** (niet Babacic — fix per 13 mei)

---

## ⚠️ Belangrijke do's & don'ts

**DO**
- Cache-bumps doen bij elke CSS/JS-edit (anders ziet bezoeker oude versie)
- Commit-messages in `type(scope): …` format
- Test eerst lokaal via `./dev.sh` (localhost:8000)
- Update `WORKLOG.md` aan eind van een sessie

**DON'T**
- `_legacy/` aanraken (oude bestanden, behouden voor historie)
- Build-tools/frameworks introduceren — bewust vanilla
- Direct op `main` werken zonder reden (deployt direct live)
- `.env` of secrets committen (FTP-creds zitten in GitHub Secrets)

---

## 📋 Volgende stappen voor een nieuwe sessie

1. Lees dit bestand (gebeurt automatisch)
2. **`git pull origin main`** — haal eventuele wijzigingen van het andere apparaat op
3. Lees `WORKLOG.md` voor laatste sessie-status
4. Check `git log -10 --oneline` voor recente commits
5. Vraag de gebruiker waar ze mee verder willen, of pak openstaande items op
6. Aan eind van sessie: **update `WORKLOG.md`** met "wat gedaan + open" + push naar `main`
