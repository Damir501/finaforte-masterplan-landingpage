/**
 * Finaforte Blinde-Vlekken-Rapport — PDF Generator (Funnel Fase B)
 *
 * Genereert een gepersonaliseerd PDF-rapport op basis van top-3 domeinen
 * uit `?p=<hash>` URL-param. Volledig client-side via jsPDF + autotable.
 *
 * Content-bron: /Users/user/Desktop/Marketing Funnel/docs/rapport-content-v1.md (v1.2)
 * - R1-R6 tarieven 2026 (extern geverifieerd, hardcoded)
 * - §3.2 Box 3 met tegenbewijsregeling
 * - §9 "Over Finaforte" (organisatie-perspectief)
 * - §10 disclaimer (e-mail-only, geen telefoon)
 *
 * Brand: Finaforte mint #00A2AA, sober/zakelijk.
 *
 * Gebruik:
 *   <script src="/shared/jspdf.umd.min.js"></script>
 *   <script src="/shared/jspdf.plugin.autotable.min.js"></script>
 *   <script src="rapport-pdf.js"></script>
 *   ...
 *   window.FinaforteRapportPDF.generate(domainIds); // ['estate','pensioengat','box3_2028']
 */
(function() {
  'use strict';

  // ============================================
  // BRAND
  // ============================================
  var BRAND = {
    mint:      [0, 162, 170],   // #00A2AA
    mintDark:  [0, 41, 43],     // #00292B
    mintLight: [240, 250, 249], // #f0faf9
    paper:     [239, 232, 216], // #efe8d8
    copper:    [183, 134, 82],  // #b78652
    darkGreen: [0, 41, 43],     // #00292B
    grey:      [102, 102, 102],
    lightGrey: [230, 230, 230],
    text:      [45, 45, 45],
    white:     [255, 255, 255]
  };

  // ============================================
  // CONTENT — vertaal scan-domein-ID naar rapport-blok
  //
  // Niet alle 13 scan-domeinen hebben een eigen blok in rapport-content-v1.md
  // (dat dekt alleen S/D, Box3, Pensioengat). Voor de andere domeinen
  // genereren we een korte diagnose-paragraaf op basis van architect-copy.js.
  // ============================================

  // De drie "rode-volledige" blokken uit rapport-content-v1.md §4.1, §5.1, §6.1.
  // We mappen scan-domein-IDs naar deze content via DOMAIN_GROUP.
  var DOMAIN_GROUP = {
    salaris_dividend:  'SD',
    box3_optimizer:    'BOX3',
    box3_2028:         'BOX3',
    pensioengat:       'PG',
    pensioen_toeslagen: 'PG',
    peb_odv_lijfrente: 'PG'
  };

  // Volledige blokken (rood-variant uit content-v1)
  var FULL_BLOCKS = {
    SD: {
      title: 'Salaris / Dividend',
      label: 'rood — er is hoogstwaarschijnlijk een blinde vlek hier.',
      sections: [
        { heading: 'Wat we zagen in uw antwoorden',
          body: 'U gaf aan dat de mix tussen salaris en dividend uit uw BV grotendeels op de automatische piloot loopt — of dat u het standaard-minimum aanhoudt zonder een jaarlijkse heroverweging.' },
        { heading: 'Waarom dat doorgaans een blinde vlek is',
          body: 'De keuze tussen salaris en dividend is geen vaste formule. Het optimum verschuift met uw inkomenstrend, de gelaagde box-2-tarieven (2026: 24,5% tot €68.843 p.p. / €137.686 fiscaal partners; daarboven 31%), uw AOW-leeftijd en pensioenopbouw, het vermogen in privé versus liquiditeit in de BV, en uw hypotheek- en aflossingsstrategie. Een accountant kent vaak één van deze variabelen goed (de boekhoudkundige kant). De andere variabelen leven elders — bij u, bij uw hypotheekadviseur, bij uw pensioenpartij. Niemand legt ze structureel op één tafel.' },
        { heading: 'Ordegrootte',
          body: 'Voor een DGA met een bruto loon van €60.000 tot €90.000 en een BV-vermogen tussen €100.000 en €500.000 gaat het verschil tussen "minimum-loon plus opname als nodig" en "doorgerekend jaarlijks optimum" doorgaans om €3.000 tot €15.000 per jaar. Over 10 jaar samengesteld is dat het verschil tussen één extra studie voor uw kind en een tweede vakantiehuis.' },
        { heading: 'Vraag om mee te nemen',
          body: 'Wanneer is voor uw situatie voor het laatst gerekend — niet op basis van het minimum, maar op basis van wat fiscaal én vermogens-strategisch optimaal is?' }
      ]
    },
    BOX3: {
      title: 'Box 3 — Vermogen buiten BV en woning',
      label: 'rood — er is hoogstwaarschijnlijk ruimte voor optimalisatie.',
      sections: [
        { heading: 'Wat we zagen in uw antwoorden',
          body: 'Uw vermogen buiten BV en eigen woning bestaat voornamelijk uit spaargeld of een mix van sparen en beleggen, en u heeft het in de afgelopen 12 maanden niet expliciet opnieuw geijkt.' },
        { heading: 'Waarom dat doorgaans een blinde vlek is',
          body: 'Box 3 is fiscaal in beweging. Het stelsel werkelijk rendement is door de Tweede Kamer aangenomen op 12 februari 2026 en staat gepland voor invoering per 1 januari 2028 (afhankelijk van Eerste Kamer). Tot die tijd geldt het forfait-stelsel (2026: sparen 1,44%, beleggen 6,00%, schulden 2,62%; tarief 36%; heffingsvrij vermogen €59.357 p.p. / €118.714 fiscaal partners). Wat in 2022 een prima box-3-positie was, hoeft in 2026 niet meer optimaal te zijn.' },
        { heading: 'Drie verschuivers',
          body: '1. Tegenbewijsregeling werkelijk rendement: sinds de Hoge Raad-arresten mag u uw werkelijke (lagere) rendement aantonen en daarover belast worden — niet over het forfait. Voor wie veel spaargeld heeft, kan dit substantieel schelen.\n\n2. Peildatum-arbitrage: het moment waarop vermogen geparkeerd staat (1 januari) bepaalt uw aanslag — verschuiving over de jaargrens kan netto-rendement materieel beïnvloeden.\n\n3. Vermogen in BV vs. privé: bij hogere vermogens kan een deel beter in BV-structuur, bij lagere juist niet. Vanaf 2028 verschuift deze afweging fundamenteel met het nieuwe stelsel.' },
        { heading: 'Ordegrootte',
          body: 'Voor iemand met een box-3-vermogen tussen €100.000 en €500.000 gaat een goed-geoptimaliseerde positie versus een onbewuste positie doorgaans om €500 tot €4.000 per jaar. Bij vermogens vanaf €500.000 loopt dat snel op naar enkele duizenden tot €15.000+ per jaar.' },
        { heading: 'Vraag om mee te nemen',
          body: 'Wanneer is voor het laatst expliciet gekeken hoe uw box-3-positie zich verhoudt tot het komende werkelijk-rendement-stelsel (per 2028) — en of u nu al via de tegenbewijsregeling minder belasting kunt betalen?' }
      ]
    },
    PG: {
      title: 'Pensioengat',
      label: 'rood — er is hoogstwaarschijnlijk een gat tussen wat u opbouwt en wat u nodig heeft.',
      sections: [
        { heading: 'Wat we zagen in uw antwoorden',
          body: 'U gaf aan dat u naast AOW óf niets specifieks heeft opgebouwd, óf alleen leunt op een oude regeling via werkgever / oude BV-pensioen (PEB). En u heeft geen doorgerekend plan dat het AOW-gat dekt tot uw gewenste leefniveau.' },
        { heading: 'Waarom dat doorgaans een blinde vlek is',
          body: 'AOW is voor de meeste DGA\'s en zelfstandigen een fractie van wat zij gewend zijn aan netto-uitgaven (2026: €1.637,57 bruto/mnd alleenstaand; €1.122,12 bruto/mnd p.p. gehuwd-samenwonend, vakantiegeld apart). Het verschil tussen de werkelijke uitgaven-norm en AOW heet het "pensioengat".' },
        { heading: 'Drie redenen onderschatting',
          body: '1. Mensen denken: "de BV is mijn pensioen" — wat klopt mits die BV een doorgerekend pensioen-mechanisme heeft (lijfrente / ODV / privébelegging), niet alleen "vermogen op de balans".\n\n2. PEB-resten die nog niet zijn afgewikkeld kosten jaarlijks renteberekening over de balans en blokkeren ruimte voor andere fiscale faciliteiten (PEB is uitgefaseerd per 2017).\n\n3. De fiscale lijfrente-ruimte is sinds de Wet toekomst pensioenen fors verruimd (jaarruimte 30% van inkomen minus franchise €19.172, maximaal €35.589 in 2026; reserveringsruimte tot 10 jaar terug, plafond €42.753 — samen maximaal €78.342 aftrekbaar) en wordt zelden volledig benut.' },
        { heading: 'Ordegrootte',
          body: 'Een DGA of zelfstandige met een gewenst pensioeninkomen van €4.000 tot €6.000 netto per maand en alleen AOW kijkt structureel tegen een gat van €2.500 tot €4.500 netto per maand — een kapitaalbehoefte van €600.000 tot €1.000.000+ afhankelijk van leeftijd. Vroeg starten met dichten kost een fractie van het bedrag waar u later mee zou moeten compenseren.' },
        { heading: 'Vraag om mee te nemen',
          body: 'Wanneer is voor het laatst doorgerekend hoeveel u per maand netto wilt overhouden vanaf uw gewenste stop-leeftijd — en wat er aan structuur nodig is om dat te dekken?' }
      ]
    }
  };

  // ============================================
  // PDF-helpers
  // ============================================
  function formatDate() {
    return new Date().toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function formatMonthYear() {
    return new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  }

  // ============================================
  // PDF-engine
  // ============================================
  function generate(domainIds) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF-bibliotheek nog niet geladen. Probeer het over een paar seconden opnieuw.');
      return;
    }
    if (!Array.isArray(domainIds) || domainIds.length === 0) {
      alert('Geen domeinen gevonden — doorloop eerst de scan.');
      return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pageWidth  = doc.internal.pageSize.getWidth();   // 210
    var pageHeight = doc.internal.pageSize.getHeight();  // 297
    var margin = 20;
    var contentWidth = pageWidth - 2 * margin;
    var bottomLimit = pageHeight - 22; // ruimte voor footer
    var y;

    // ── helpers met state-closure ───────────────
    function setColor(rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
    function setFill(rgb)  { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
    function setDraw(rgb)  { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

    function ensureSpace(needed) {
      if (y + needed > bottomLimit) {
        doc.addPage();
        y = margin;
        drawPageHeaderBand();
      }
    }

    function drawPageHeaderBand() {
      // Subtiele mint-band bovenaan elke pagina (geen full-bleed) — alleen titelpagina krijgt grotere band
      setFill(BRAND.mint);
      doc.rect(0, 0, pageWidth, 8, 'F');
      y = Math.max(y, margin);
    }

    function drawFooter(pageNum, totalPages) {
      setColor(BRAND.grey);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      var leftText = 'Finaforte — info@finaforte.nl — masterplan.finaforte.nl';
      var rightText = 'Pagina ' + pageNum + ' van ' + totalPages;
      doc.text(leftText, margin, pageHeight - 10);
      doc.text(rightText, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    function heading(text, size) {
      ensureSpace((size || 14) * 0.7);
      setColor(BRAND.darkGreen);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size || 14);
      doc.text(text, margin, y);
      y += (size || 14) * 0.45;
    }

    function subheading(text) {
      ensureSpace(7);
      setColor(BRAND.mint);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(text, margin, y);
      y += 5.5;
    }

    function paragraph(text, opts) {
      opts = opts || {};
      var size = opts.size || 10;
      var color = opts.color || BRAND.text;
      doc.setFont('helvetica', opts.italic ? 'italic' : 'normal');
      doc.setFontSize(size);
      setColor(color);
      var lines = doc.splitTextToSize(text, contentWidth);
      var lineH = size * 0.42;
      lines.forEach(function(line) {
        ensureSpace(lineH);
        doc.text(line, margin, y);
        y += lineH;
      });
      y += 2;
    }

    function rule(rgb, widthMm) {
      setDraw(rgb || BRAND.mint);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + (widthMm || 30), y);
      y += 4;
    }

    // ============================================
    // PAGE 1 — Cover
    // ============================================
    // Mint hero band
    setFill(BRAND.mint);
    doc.rect(0, 0, pageWidth, 70, 'F');

    setColor(BRAND.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('Finaforte', margin, 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Masterplan voor uw vermogen', margin, 40);

    doc.setFontSize(9);
    doc.text(formatDate(), pageWidth - margin, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.text('PERSOONLIJK RAPPORT', pageWidth - margin, 25, { align: 'right' });

    y = 92;

    // Titel
    setColor(BRAND.darkGreen);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    var titleLines = doc.splitTextToSize('Uw persoonlijke bouwtekening', contentWidth);
    titleLines.forEach(function(l) { doc.text(l, margin, y); y += 10; });
    y += 2;

    // Subtitel
    setColor(BRAND.grey);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    var subLines = doc.splitTextToSize('Een eerste blik op waar uw financiële plaatje al staat — en waar het stevig kan worden.', contentWidth);
    subLines.forEach(function(l) { doc.text(l, margin, y); y += 6; });
    y += 4;

    rule(BRAND.copper, 40);
    y += 4;

    // Personalisatie-regel
    setColor(BRAND.text);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.text('Opgemaakt op ' + formatDate() + ' op basis van uw antwoorden in de Blinde-Vlekken-Scan.', margin, y);
    y += 12;

    // Top-3 lijst-preview
    setColor(BRAND.darkGreen);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Drie aandachtspunten die een financieel architect direct zou opmerken:', margin, y);
    y += 8;

    var architect = window.ARCHITECT || { domeinen: {} };
    domainIds.forEach(function(id, idx) {
      var dom = architect.domeinen[id];
      var title = dom ? dom.title : id;
      var titleX = margin + 12;
      var lines = doc.splitTextToSize(title, contentWidth - 14);
      var blockHeight = lines.length * 5;
      ensureSpace(blockHeight + 4);
      // Vertical-center: 22pt cijfer (cap-height ~5.5mm) op visueel midden van titel-blok.
      // Eerste titel-baseline op y - 4, blok-center op (y - 4) + (blockHeight - 5) / 2 + 2.5
      var titleCenterY = (y - 4) + (blockHeight - 5) / 2 + 2.5;
      var numberBaselineY = titleCenterY + 2.75;
      setColor(BRAND.copper);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(String(idx + 1), margin, numberBaselineY);
      setColor(BRAND.darkGreen);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      lines.forEach(function(line, li) {
        doc.text(line, titleX, y - 4 + (li * 5));
      });
      y += Math.max(13, blockHeight + 5);
    });

    y += 10;

    // Disclaimer-regel onderaan cover
    setColor(BRAND.grey);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    var dl = doc.splitTextToSize('Dit rapport is een vrijblijvende eerste signalering. Geen advies. Tarieven en regelgeving gebruikt: stand ' + formatMonthYear() + '.', contentWidth);
    dl.forEach(function(l) { doc.text(l, margin, y); y += 4; });

    // ============================================
    // PAGE 2 — Opener
    // ============================================
    doc.addPage();
    drawPageHeaderBand();
    y = margin + 6;

    heading('Een eerste spiegel', 18);
    rule(BRAND.copper, 30);
    y += 2;

    paragraph('U heeft zojuist een paar minuten geïnvesteerd in een aantal vragen — en dat is genoeg om de eerste lijnen van uw bouwtekening op papier te krijgen.', { size: 11 });

    paragraph('De meeste ondernemers en vermogensbouwers waar wij mee werken denken dat hun fundament op orde is. Vaak klopt dat ook — voor het stuk dat hun accountant, notaris of bank ziet. Maar elk van die adviseurs bouwt mee aan een eigen muur. Niemand bewaakt de hele tekening. En precies dáár blijven dingen liggen die u structureel geld of optimalisatie kosten.', { size: 11 });

    paragraph('Hieronder vindt u per onderwerp wat wij zagen in uw antwoorden — en wat dat doorgaans betekent voor iemand met een vergelijkbaar profiel. Geen advies. Wel een eerste spiegel.', { size: 11 });

    // ============================================
    // PAGES 3+ — Top-3 domeinen
    // ============================================
    domainIds.forEach(function(id, idx) {
      doc.addPage();
      drawPageHeaderBand();
      y = margin + 6;

      var group = DOMAIN_GROUP[id];
      var full = group ? FULL_BLOCKS[group] : null;
      var architectDom = (architect.domeinen || {})[id];

      // Nummer + titel
      setColor(BRAND.copper);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(44);
      doc.text(String(idx + 1), margin, y + 10);

      setColor(BRAND.darkGreen);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      var title = full ? full.title : (architectDom ? architectDom.title : id);
      var titleLines2 = doc.splitTextToSize(title, contentWidth - 20);
      titleLines2.forEach(function(l, li) {
        doc.text(l, margin + 20, y + 4 + (li * 7));
      });
      y += Math.max(16, titleLines2.length * 7 + 8);

      rule(BRAND.mint, 30);
      y += 2;

      if (full) {
        // Volledig blok (S/D, Box3, Pensioen) uit content-v1.md
        setColor(BRAND.mint);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.text('Uw score: ' + full.label, margin, y);
        y += 7;

        full.sections.forEach(function(sec) {
          subheading(sec.heading);
          paragraph(sec.body, { size: 10 });
        });
      } else {
        // Korte diagnose-paragraaf voor overige domeinen
        if (architectDom) {
          subheading('Wat we zagen');
          paragraph(architectDom.uitleg && architectDom.uitleg.indexOf('[') !== 0
            ? architectDom.uitleg
            : 'Op basis van uw antwoorden viel dit domein op als aandachtspunt. De uitleg wordt door Damir aangevuld in de volgende editie van dit rapport.',
            { size: 10 });

          subheading('Vraag om mee te nemen');
          paragraph('Wanneer is voor het laatst integraal naar dit onderdeel gekeken, in samenhang met uw fiscale structuur, vermogen en pensioen?', { size: 10, italic: true });

          subheading('Vervolgstap');
          paragraph('In het kennismakingsgesprek lichten wij toe wat dit onderwerp specifiek voor uw situatie betekent en welke ordegrootte erbij hoort.', { size: 10 });
        } else {
          paragraph('Op basis van uw antwoorden zien wij dit domein als aandachtspunt. Tijdens een kennismakingsgesprek lichten wij toe wat dit voor uw situatie betekent.', { size: 10 });
        }
      }
    });

    // ============================================
    // PAGE — Drie-vragen-spiegel
    // ============================================
    doc.addPage();
    drawPageHeaderBand();
    y = margin + 6;

    heading('Drie vragen die wij doorgaans stellen', 18);
    rule(BRAND.copper, 30);
    y += 2;

    paragraph('Een architect begint zelden met een oplossing. Hij begint met vragen die laten zien waar de tekening nog open is. Als u deze drie eerlijk beantwoordt, weet u waar u staat.', { size: 11, italic: true });

    subheading('1.');
    paragraph('Wanneer is voor het laatst uw hele financiële plaatje op één tafel doorgerekend — fiscaal, vermogen en pensioen samen, met dezelfde aannames over uw leven over 5, 10, 20 jaar?', { size: 10 });
    paragraph('Als het antwoord is "nog nooit zo" of "meer dan 3 jaar geleden" — dan weet u dat de tekening uit verschillende handen komt, niet uit één. Dat is normaal. Het zegt niets over de kwaliteit van uw adviseurs. Het zegt iets over of er een hoofdarchitect is.', { size: 9, italic: true, color: BRAND.grey });

    subheading('2.');
    paragraph('Welke beslissing schuift u op de lange baan omdat hij "te complex" is om in één gesprek met uw accountant of bank op te lossen?', { size: 10 });
    paragraph('Vaak is dat hét punt waar de meeste fiscale en strategische winst zit. Niet omdat het onmogelijk is — maar omdat het te integraal is voor één adviseur en daardoor bij niemand op de stapel komt.', { size: 9, italic: true, color: BRAND.grey });

    subheading('3.');
    paragraph('Hoe ziet uw structuur er optimaal uit als u over 10 jaar terug zou kijken — en wat is daarvoor de eerstvolgende stap die u niet zelf hoeft te bedenken?', { size: 10 });
    paragraph('Een goede bouwtekening hoeft niet alle stappen tegelijk te bouwen. Hij laat alleen zien: hier is de volgorde, hier zijn de keuzes, hier is wat dít jaar moet en wat volgend jaar kan wachten.', { size: 9, italic: true, color: BRAND.grey });

    // ============================================
    // PAGE — Tarieventabel 2026 (autotable)
    // ============================================
    doc.addPage();
    drawPageHeaderBand();
    y = margin + 6;

    heading('Tarieven & grensbedragen 2026', 16);
    rule(BRAND.copper, 30);
    y += 2;

    paragraph('Een beknopte referentie van de fiscale parameters die in dit rapport indirect of direct worden aangehaald. Stand: ' + formatMonthYear() + '.', { size: 10, italic: true, color: BRAND.grey });

    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Onderdeel', 'Tarief / grensbedrag 2026']],
        body: [
          ['AOW alleenstaand', '€1.637,57 bruto/mnd (excl. vakantiegeld €106,55)'],
          ['AOW gehuwd-samenwonend', '€1.122,12 bruto/mnd p.p. (excl. vakantiegeld €76,10)'],
          ['Box 2 — tarief schijf 1', '24,5% tot €68.843 p.p. (€137.686 fiscaal partners)'],
          ['Box 2 — tarief schijf 2', '31% boven de schijfgrens'],
          ['Box 3 — forfait sparen', '1,44%'],
          ['Box 3 — forfait beleggen', '6,00%'],
          ['Box 3 — forfait schulden', '2,62%'],
          ['Box 3 — tarief', '36%'],
          ['Box 3 — heffingsvrij vermogen', '€59.357 p.p. / €118.714 fiscaal partners'],
          ['Jaarruimte lijfrente', '30% × (inkomen − franchise €19.172), max €35.589'],
          ['Reserveringsruimte lijfrente', 'plafond €42.753 (10 jaar terug)'],
          ['Werkelijk-rendement-stelsel Box 3', 'TK aangenomen 12-02-2026, beoogd 1-1-2028']
        ],
        theme: 'grid',
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
          lineColor: BRAND.lightGrey,
          lineWidth: 0.2,
          textColor: BRAND.text,
          font: 'helvetica'
        },
        headStyles: {
          fillColor: BRAND.mint,
          textColor: BRAND.white,
          fontStyle: 'bold',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: contentWidth - 70 }
        }
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    paragraph('Bron: SVB, Belastingdienst, Rijksoverheid (peildatum mei 2026). Concrete bedragen, percentages en grensbedragen zijn indicatief en moeten in een persoonlijk gesprek of doorrekening worden geverifieerd.', { size: 8, italic: true, color: BRAND.grey });

    // ============================================
    // PAGE — Over Finaforte
    // ============================================
    doc.addPage();
    drawPageHeaderBand();
    y = margin + 6;

    heading('Over Finaforte', 18);
    rule(BRAND.copper, 30);
    y += 2;

    paragraph('Finaforte is een Nederlandse adviesonderneming die werkt vanuit één principe: de bouwheer blijft baas, maar de tekening hoort uit één hand te komen.', { size: 11 });

    paragraph('Wij maken Masterplannen voor DGA\'s, ondernemers en vermogensbouwers die merken dat hun accountant, notaris en bank ieder een goed stukje van het plaatje bewaken — maar dat niemand het geheel overziet.', { size: 11 });

    paragraph('Een Masterplan is een vaste-prijs uitvoerings-routekaart van ongeveer 30 pagina\'s. Daarin staat wat er, in welke volgorde, voor uw situatie aangepakt moet worden — fiscaal, structureel en op uw vermogen. Daarna bepaalt u of u het zelf uitvoert of de uitvoering aan ons uitbesteedt.', { size: 11 });

    subheading('Onze werkwijze');
    paragraph('Wij brengen de financiële beslissingen die nu over verschillende tafels verspreid liggen — hypotheek, fiscale structuur, BV-vermogen, pensioen, vermogen privé — terug naar één integraal plan. Geen losse adviezen per onderdeel, maar één tekening waarop te zien is hoe de keuzes elkaar beïnvloeden over de komende 10 tot 20 jaar.', { size: 11 });

    y += 4;
    setFill(BRAND.mintLight);
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');
    setColor(BRAND.darkGreen);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Vragen na het lezen?', margin + 6, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Mail vrijblijvend: info@finaforte.nl — wij reageren doorgaans binnen één werkdag.', margin + 6, y + 17);
    doc.setFontSize(9);
    setColor(BRAND.grey);
    doc.text('Of plan direct een kennismakingsgesprek via masterplan.finaforte.nl/rapport/.', margin + 6, y + 23);
    y += 32;

    // ============================================
    // PAGE — Disclaimer
    // ============================================
    doc.addPage();
    drawPageHeaderBand();
    y = margin + 6;

    heading('Disclaimer', 16);
    rule(BRAND.copper, 30);
    y += 2;

    paragraph('Dit rapport is een vrijblijvende eerste signalering op basis van uw antwoorden in de Blinde-Vlekken-Scan op ' + formatDate() + '. Het is geen fiscaal of financieel advies en niet bedoeld als vervanging daarvan.', { size: 10, italic: true });

    paragraph('Tarieven, regels en regelgeving die in dit rapport indirect of direct worden aangehaald, zijn gebaseerd op de stand van zaken per ' + formatMonthYear() + ' — kwartaalmatig bij te werken. De fiscale wet- en regelgeving (in het bijzonder rond box 3, box 2, DGA-salaris en pensioen) is in de jaren 2026–2028 in ontwikkeling. Concrete bedragen, percentages en grensbedragen in dit rapport zijn indicatief en moeten in een persoonlijk gesprek of doorrekening worden geverifieerd voordat u beslissingen neemt.', { size: 10, italic: true });

    paragraph('Finaforte aanvaardt geen aansprakelijkheid voor beslissingen genomen op basis van dit rapport zonder voorafgaand gesprek of doorrekening.', { size: 10, italic: true });

    paragraph('Vragen of opmerkingen over dit rapport? Mail naar info@finaforte.nl.', { size: 10, italic: true });

    // ============================================
    // FOOTERS op alle pagina's
    // ============================================
    var totalPages = doc.internal.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawFooter(p, totalPages);
    }

    // ============================================
    // DOWNLOAD
    // ============================================
    var ts = new Date().toISOString().slice(0, 10);
    var filename = 'Finaforte-Blinde-Vlekken-Rapport-' + ts + '.pdf';
    doc.save(filename);
  }

  // Exporteer
  window.FinaforteRapportPDF = { generate: generate };
})();
