# 🎨 INFOGRAPHIC BRIEF — Finaforte Funnel Status

> **Status**: Mei 2026
> **Doel**: Visuele infographic die in één oogopslag laat zien waar de funnel staat
> **Tone**: Energiek, positief, vooruitgang vierend (NIET somber!)

---

## 📌 INSTRUCTIE VOOR DE INFOGRAPHIC-AGENT

Hoi! Jij bent de volgende agent in de keten. Jouw taak:

1. **Lees dit complete bestand** — alle data, kleuren, en tone-of-voice die je nodig hebt staan hieronder
2. **Genereer een infographic** met je beschikbare tool (Canva, Gamma, Figma, etc.)
3. **Output**: één visueel beeld dat Damir morgenochtend opent op zijn telefoon en meteen denkt _"hé, ik sta er goed voor!"_
4. **Vermijd**: lange lijsten met "todo's" — focus op WAT-AL-AF-IS, niet op wat nog moet
5. **Aspect ratio**: maak 'm geschikt voor zowel mobiel (9:16) als desktop (16:9) — of lever beide

**Bij twijfel**: kies altijd voor "celebrate the wins" boven "list the problems".

---

## 🎨 BRAND DESIGN CONTEXT — FINAFORTE

### Kleurenpalet (gebruik EXACT deze hex-codes)

```
PRIMAIR (acties, CTA's, succes)
├─ Mint           #00A2AA  ← hoofdkleur, gebruik voor "DONE"-badges
├─ Mint-dark      #00838B  ← hover / dieptes
├─ Mint-deep      #003D40  ← donker accent, text op cream
└─ Mint-light     #E6F7F8  ← achtergrond-vlakken

ACCENT (highlights, warm)
├─ Orange         #F28E18  ← energie, attention
└─ Copper         #b78652  ← luxueus accent, "editorial" feel

PAPIER (achtergrond, body)
├─ Cream          #F8F7F4  ← lichtste paper
├─ Cream-warm     #F5F1E8  ← editorial paper (hoofd-bg)
├─ Paper          #efe8d8  ← warmer paper
└─ Paper-dark     #e0d5bf  ← scheidslijnen

TEKST
├─ Ink            #1a2738  ← hoofdtekst
├─ Ink-muted      #5a6478  ← bijzaken
└─ Dark-green     #00292B  ← display headers
```

### Typografie

- **Display / Headers**: `Fraunces` (serif, met **italic accent-woorden** in kop-zinnen)
- **Body**: `Manrope` (sans-serif)
- **Stijl-signature**: eyebrows met flanking dashes → `— TITEL —`

### Mood & Visual Style

- **Editorial paper-look** — alsof het uit een chic adviesrapport komt
- **Subtiele dot-grid** als achtergrond-textuur (kleur: `rgba(0,61,64,0.06)`)
- **Crop-marks** in hoeken (printer-vibe)
- **Compass-rose** als terugkerend symbool (Finaforte = navigatie voor DGA's)
- **Multi-layer shadows** voor diepte zonder zwaar te worden
- **Italic Fraunces** voor "menselijke" accenten

**NIET**: geen vlakke flat-design, geen tech-blauw, geen corporate-grijs.
**WEL**: warm, papier-achtig, met couleur-locale van een persoonlijk adviseur.

---

## 🗺️ DE FUNNEL — 5 STATIONS

> _"Van anonieme bezoeker naar betalende DGA-klant"_

```
👤 BEZOEKER ─────────────────────────────────────────► 💼 KLANT
            F1 → F-A → F-B → F-C → F5
```

**Alle 5 stations zijn LIVE en werkend.** Dit is de hoofdboodschap van de infographic.

---

### 🏠 STATION 1 — F1 LANDING `/`

| | |
|---|---|
| **Naam** | Landing / Homepage |
| **Functie** | Eerste indruk → klik op CTA |
| **Status** | ✅ **LIVE** |
| **Icon-suggestie** | 🧭 kompas / huis met deur |
| **Kleur-accent** | Mint `#00A2AA` |

**Waarom dit station er goed bij staat** (kies 3 om visueel te tonen):
- Editorial paper-stijl met compass-rose hero
- Trustbadge: *"Finaforte · sinds 2007"*
- Review-carousel met 6 anonieme persona-quotes
- "Over Damir" sectie met persoonlijk verhaal
- Sticky header + mobile hamburger
- Floating help-button + contact-modal
- Sticky mobile CTA-bar onder 900px

**CTA-flow**: → SCAN

---

### 📋 STATION 2 — F-A SCAN `/scan/`

| | |
|---|---|
| **Naam** | Fiscale Scan |
| **Functie** | 13 vragen → email-capture |
| **Status** | ✅ **LIVE** |
| **Icon-suggestie** | 📋 checklist / lijst met 13 vinkjes |
| **Kleur-accent** | Mint `#00A2AA` met copper-detail |

**Highlights**:
- **13 vragen** (Q1 t/m Q13) over fiscale situatie DGA
- Cream paper + Fraunces serif voor de vragen
- Email-gate via token-guard modal
- Device-fingerprint tegen multi-submit
- Triggert Brevo-webhook na completion

**CTA-flow**: → RAPPORT

---

### 📄 STATION 3 — F-B RAPPORT `/rapport/`

| | |
|---|---|
| **Naam** | Persoonlijk PDF-rapport |
| **Functie** | 8-pagina download + follow-up FAQ |
| **Status** | ✅ **LIVE** |
| **Icon-suggestie** | 📄 document met download-pijl |
| **Kleur-accent** | Copper `#b78652` |

**Highlights**:
- **8 pagina's** gepersonaliseerd rapport
- Gegenereerd met jsPDF (live in browser)
- Cream paper + copper-top "vlek-cards"
- Mini-FAQ met 4 vragen over follow-up
- 3-card crosslink-belt naar masterplan/implementatie

**CTA-flow**: → MAIL + CALL

---

### 📧 STATION 4 — F-C BREVO MAIL `api/`

| | |
|---|---|
| **Naam** | Email-automatisering |
| **Functie** | Drip-mails + bevestigingen |
| **Status** | ✅ **LIVE** (Brevo dashboard) |
| **Icon-suggestie** | 📧 envelop met motion-lines |
| **Kleur-accent** | Orange `#F28E18` |

**Highlights**:
- **2 PHP-proxies** in de repo:
  - `brevo-scan-completion.php` (lead-capture)
  - `calendly-webhook.php` (F5-bevestiging)
- Security-hardened: host-whitelist + header-injection guard
- Email-templates leven in Brevo cloud-dashboard
- Mail-rendering met naam: **Damir Tvrtkovic**

**CTA-flow**: leidt door naar CALL

---

### 📞 STATION 5 — F5 CALENDLY CALL

| | |
|---|---|
| **Naam** | Kennismakingsgesprek |
| **Functie** | Booking → bevestiging → call |
| **Status** | ✅ **LIVE** |
| **Icon-suggestie** | 📞 telefoon / 📅 kalender met groene haak |
| **Kleur-accent** | Mint-deep `#003D40` |

**Highlights**:
- Calendly-embed op meerdere paginas
- Webhook ontvangt booking-event
- Brevo F5-bevestigingsmail
- Direct contact-bridge via help-button

**CTA-flow**: → 🎉 KLANT-RELATIE!

---

## 🛠️ DE INFRASTRUCTUUR (onder de motorkap)

Toon dit als een **sub-laag onder de funnel**, niet als hoofdfocus. Het zijn "support-systems" die alle 5 stations dragen.

```
✅ GoatCounter Analytics    (event-tracking)
✅ SEO + og:image           (social-ready)
✅ Editorial Design          (Niveau A→E afgerond)
✅ Mobile-first Nav          (sticky + hamburger)
✅ Performance               (DNS-prefetch + preconnect)
✅ Auto-deploy via FTP       (GitHub Actions → cPanel)
✅ 13 Mini-Calculators       (waarde-magneten)
✅ Documentatie              (CLAUDE.md + WORKLOG.md)
```

---

## 📊 DE GROOTSE GETALLEN (gebruik als visual headlines)

```
   5         ─  Funnel-stages, alle LIVE
  13         ─  Interactieve fiscale calculators
   5         ─  Hoofdpaginas met sticky nav
  17         ─  Pagina's met analytics-tracking
   2         ─  PHP API-proxies (security-hardened)
   8         ─  Pagina's in het PDF-rapport
   1         ─  Eigenaar achter de schermen — Damir 🇳🇱
2007         ─  Jaar Finaforte opgericht
```

---

## 🎯 LAYOUT-SUGGESTIES (kies één, of combineer)

### Optie A: Horizontaal Lint
```
[F1] ──► [F-A] ──► [F-B] ──► [F-C] ──► [F5]
 🏠       📋        📄         📧        📞
LIVE     LIVE      LIVE       LIVE      LIVE
```
Geschikt voor desktop. 5 cards naast elkaar, met grote groene "LIVE"-badges.

### Optie B: Verticale Reis (mobiel)
Top: 👤 BEZOEKER → 5 verticale stations onder elkaar → bottom: 💼 KLANT
Elke stop heeft een **groene haak ✓** rechts naast de titel.

### Optie C: Compass-Rose Layout
Compass-rose in het midden. 5 windrichtingen = 5 funnel-fases. Past visueel bij de brand.

### Optie D: "Bouwtekening" Layout
Editorial paper-look met meet-lijntjes en typografische highlights. Voelt als technisch dossier van een architect.

---

## ✨ TONE & MESSAGING TIPS

### DO ✅
- **"Funnel staat — nu finetunen"** als hoofdboodschap
- Gebruik **percentages**: "Bouw-fase 100% klaar"
- **Vier de mijlpalen**: "13 calculators ✓ 5 fases ✓ Live ✓"
- **Italic-accent** op menselijke woorden: *"persoonlijk"*, *"vertrouwd"*, *"klaar"*

### DON'T ❌
- Geen lange lijst "open todo's" — maak het klein, hoofdfocus = wat AF is
- Geen procesdiagrammen die saai aanvoelen
- Geen tech-jargon zoals "API-proxy" in hoofdkoppen — wel als sub-label
- Geen rode/oranje "waarschuwings"-iconen — alles is mint/copper/cream

---

## 📐 OUTPUT SPECS

| Use-case | Aspect ratio | Doel |
|----------|--------------|------|
| Mobiel preview | 9:16 of 4:5 | Bekijken op telefoon 's ochtends |
| Desktop overzicht | 16:9 | In Claude Code / als wallpaper |
| Print-versie | A4 portrait | Optioneel — uitprinten als poster |

**Bestandsnaam-suggesties**:
- `finaforte-funnel-status-mei2026.png`
- `funnel-overview-infographic.svg` (vector als beschikbaar)

---

## ✅ DONE-CRITERIA (voor de Infographic-Agent)

De infographic is klaar als:

- [ ] Alle 5 funnel-fases visueel herkenbaar zijn
- [ ] Elke fase heeft een **groene "LIVE"-indicator**
- [ ] Brand-kleuren (mint + cream + copper) consistent toegepast
- [ ] **Fraunces-serif** gebruikt voor headers (of vervangende serif als niet beschikbaar)
- [ ] De hoofdboodschap is **"Bouw klaar — nu schaal"** (positief framing)
- [ ] Toon: editorial + warm, NIET tech/corporate
- [ ] Output in tenminste 1 web-vriendelijk formaat (PNG/SVG/JPG)

---

## 🔗 RELEVANTE CONTEXT-FILES IN DEZE REPO

Als je meer wilt weten:
- **`CLAUDE.md`** — project-context, tech-stack, design-taal
- **`WORKLOG.md`** — wat er per dag is gebeurd (sessie-historie)
- **`styles/tokens.css`** — exacte design-tokens als CSS-variabelen
- **`README.md`** — repo-overzicht + structuur

---

## 🙏 BEDANKT

Als deze brief duidelijk is, kun je direct aan de slag. Als iets onduidelijk is: vraag Damir (de owner) of check de bronfiles in deze repo.

**Maak iets moois. Damir gaat er morgen blij van worden.** 🎨✨
