# Finaforte Masterplan Landing Page

Lead-generatie landingpagina met 13+ interactieve DGA-calculators.

🌍 **Live**: https://masterplan.finaforte.nl/
📦 **Repo**: https://github.com/Damir501/finaforte-masterplan-landingpage

---

## Snelstart

### 🌐 Lokaal werken (preview in browser)

```bash
./dev.sh
```

Open daarna `http://localhost:8000` in je browser. Wijzig bestanden in een editor (bijv. VS Code, Sublime, Cursor) en ververs de browser om je wijzigingen te zien.

### 🚀 Live zetten

```bash
./deploy.sh "wat ik veranderd heb"
```

Dit commit + pusht je wijzigingen naar GitHub. cPanel pikt het automatisch op (na eenmalige setup — zie hieronder).

---

## Project structuur

```
.
├── index.html              # Hoofdlanding pagina
├── Mini-Calculators/       # 13 calculator HTML-bestanden
│   ├── 01_Salaris_vs_Dividend/
│   ├── 02_Eigen_Woning_Hefboom/
│   ├── ...
│   └── 13_Box3_2028_Impact/
├── shared/                 # Gedeelde scripts (token-guard, pdf-generator, jsPDF)
├── deploy.sh               # Push naar live
├── dev.sh                  # Lokale preview server
└── .cpanel.yml             # cPanel deploy configuratie
```

---

## Workflow

```
┌──────────┐   ./deploy.sh   ┌──────────┐  GitHub Actions  ┌──────────┐
│  LOKAAL  │ ───────────────▶│  GITHUB  │ ────FTP sync────▶│  cPANEL  │
│  (Mac)   │                 │   main   │                  │  (live)  │
└──────────┘                 └──────────┘                  └──────────┘
```

1. Edit lokaal in je editor
2. `./dev.sh` → preview op `localhost:8000`
3. `./deploy.sh "boodschap"` → naar GitHub
4. GitHub Actions FTP-synct naar cPanel → live binnen ±1 minuut

Status van elke deploy: https://github.com/Damir501/finaforte-masterplan-landingpage/actions

---

## Eenmalige setup — GitHub Secrets voor FTP

Deze drie secrets zet je één keer in GitHub:
`Settings → Secrets and variables → Actions → New repository secret`

| Secret naam     | Waarde                                                       |
|-----------------|--------------------------------------------------------------|
| `FTP_SERVER`    | FTP-host uit cPanel (bijv. `masterplan.finaforte.nl` of `ftp.finaforte.nl`) |
| `FTP_USERNAME`  | FTP-gebruikersnaam (cPanel → FTP Accounts)                   |
| `FTP_PASSWORD`  | FTP-wachtwoord                                                |

De workflow staat in `.github/workflows/deploy.yml` en uploadt alleen gewijzigde bestanden via FTPS naar `/public_html/`.

---

## Calculators

| # | Naam | Pad |
|---|------|-----|
| 1 | Salaris vs Dividend | `Mini-Calculators/01_Salaris_vs_Dividend/` |
| 2 | Eigen Woning Hefboom | `Mini-Calculators/02_Eigen_Woning_Hefboom/` |
| 3 | Box 3 Optimizer | `Mini-Calculators/03_Box3_Optimizer/` |
| 4 | Lenen van BV | `Mini-Calculators/04_Lenen_van_BV/` |
| 5 | Pensioen Toeslagen | `Mini-Calculators/05_Pensioen_Toeslagen/` |
| 6 | Estate Planning | `Mini-Calculators/06_Estate_Planning/` |
| 7 | Peildatum Timing | `Mini-Calculators/07_Peildatum_Timing/` |
| 8 | Vastgoed Scenario | `Mini-Calculators/08_Vastgoed_Scenario/` |
| 9 | PEB / ODV / Lijfrente | `Mini-Calculators/09_PEB_ODV_Lijfrente/` |
| 10 | Aflossen vs Beleggen | `Mini-Calculators/10_Aflossen_vs_Beleggen/` |
| 11 | Pensioengat | `Mini-Calculators/11_Pensioengat/` |
| 12 | Schenken vs Erven | `Mini-Calculators/12_Schenken_vs_Erven/` |
| 13 | Box 3 Impact 2028 | `Mini-Calculators/13_Box3_2028_Impact/` |
