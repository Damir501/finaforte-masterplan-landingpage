# WORKLOG — Sessie-logboek

> Per sessie 3-5 regels: **wat gedaan + wat staat open**.
> Nieuwste boven. Onderhouden door Claude aan einde van elke sessie.
> Voor projectcontext zie `CLAUDE.md`.

---

## 📅 2026-05-14 — Sessie ochtend (mobiel-setup)

**Gedaan**
- Repo-onboarding: `CLAUDE.md` + `WORKLOG.md` aangemaakt voor sessie-continuïteit tussen laptop ↔ mobiel
- Workflow bevestigd: laptop + mobiel werken beide op branch `claude/repo-exploration-tMNMG`
- Toegang verifieerd: Claude Code op web (claude.ai/code) werkt vanaf telefoon

**Status van de site**
- Working tree clean, alles gesynct met `origin`
- 4 hoofdpaginas (`/`, `/masterplan/`, `/implementatie/`, `/rapport/`) hebben sticky header + mobile hamburger
- Editorial paper-look in alle paginas (Niveau A → D afgerond gisteren)
- Homepage upgrade Fase-2 live: trustbadge, "Over Damir", review-carousel

**Open / volgende kandidaten**
- [ ] QA-ronde: alle 4 hoofdpaginas + 13 calculators doorlopen op mobiel + desktop
- [ ] Verifiëren werk van gisteren is correct gerenderd (review-carousel, "Over Damir", trustbadge)
- [ ] Niveau-F plannen (SEO-content? Blog? Case studies? Video-intro?)
- [ ] Wanneer tevreden: `claude/repo-exploration-tMNMG` mergen naar `main` → live deploy

---

## 📅 2026-05-13 — Volledige werkdag (laptop)

### 🌅 Ochtend — Funnel + infrastructuur

- `feat(analytics)`: GoatCounter pageview-tracking in 17 HTML-paginas
- `feat(seo)`: og:image + favicon + LinkedIn-handle in 4 hoofdpaginas
- `feat(scan)`: Funnel-Fase-A — Q12/Q13 + email-capture + Brevo webhook handoff
- `feat(rapport)`: Funnel-Fase-B — Download-PDF-knop met gepersonaliseerd 8-pag rapport (jsPDF)
- `feat(funnel-C)`: Brevo scan-completion PHP-proxy + endpoint rename
- `fix(funnel-C)`: security-harden Brevo proxy — host-whitelist + header-injection guard
- `fix(api)`: naam Damir Babacic → **Tvrtkovic** in F1 mail-rendering
- `feat(api)`: Calendly→Brevo webhook bridge voor F5-bevestigingsmail
- `feat(footer)`: persoonlijke LinkedIn Damir naast Finaforte company

### 🎨 Middag — Editorial design pivot (Niveau A → D)

- `Niveau A`: refined typography + multi-layer shadows + micro-interactions
- `Niveau C/1` cream body-bg + dot-grid + paper-tokens
- `Niveau C/2` italic accent-woorden in hero h1 + serif italic lead-paragraphs
- `Niveau C/3` eyebrow met flanking dashes (— TITEL —)
- `Niveau C/4` section-backgrounds naar paper-editorial (geen pure white)
- `Niveau C/5` sidebar-TOC met IntersectionObserver active-state
- `Niveau C/6` crop-marks viewport-hoeken + compass-rose hero SVG
- `Niveau C/7` document-status footer + `body.has-toc` gating
- `Niveau D/1` token-guard modal naar editorial card-stijl
- `Niveau D/2` scan editorial-pivot — cream paper + Fraunces vragen
- `Niveau D/3` rapport editorial-pivot — cream paper + copper-top vlek-cards
- `Niveau D/4` 13 Mini-Calculators linken globale tokens.css

### 🌆 Avond — Niveau E (homepage upgrade Fase-2)

- `feat(masterplan)`: nieuwe `/masterplan/` detailpagina — 6-stappen werkwijze + FAQ
- `feat(nav)`: sticky header + mobile hamburger op 4 hoofdpaginas
- `feat(homepage)`: diensten-sectie herframen als TRAJECT (Masterplan → Implementatie)
- `feat(implementatie)`: FAQ 3 → 6 vragen (vrijblijvendheid, exit, geschiktheid)
- `feat(crosslink)`: 3-card crosslink-belt op masterplan + implementatie + rapport
- `feat(rapport)`: mini-FAQ met 4 vragen over follow-up
- `feat(analytics)`: event-tagging op key-CTAs + analytics-cta.js loader (5 paginas)
- `feat(homepage/2B)`: trustbadge "Finaforte · sinds 2007" boven hero h1
- `feat(homepage/2D)`: "Over Damir" sectie na bewijs-quote
- `feat(homepage/2A)`: reviewcarousel met 6 anonieme persona-quotes
- `chore`: cache-buster bumps (`?v=g → h → i → j`)

**Laatste commit**: `83e3a42` om 18:08 — alles afgesloten met cache-bust.

---

## 📝 Hoe deze log te onderhouden

Aan eind van een sessie:
1. Voeg nieuwe entry **bovenaan** toe met datum
2. Vermeld: **Gedaan** (bullet-list) + **Open** (todo-checkboxes)
3. Commit met `chore(worklog): sessie YYYY-MM-DD samenvatting`
4. Push naar werk-branch

Op deze manier weet elke nieuwe sessie (laptop óf mobiel) precies waar we gebleven zijn.
