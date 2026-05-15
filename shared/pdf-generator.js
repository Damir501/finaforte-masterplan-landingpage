/**
 * Finaforte PDF Rapport Generator
 * Genereert professionele PDF-rapporten vanuit calculator resultaten
 * Gebruikt jsPDF + jsPDF-AutoTable (geladen via CDN)
 *
 * Brand: Finaforte (#00A2AA mintgroen, #F28E18 oranje, #2D2D2D donkergrijs)
 * Fonts: Helvetica (jsPDF built-in, closest to Public Sans)
 */

(function() {
  'use strict';

  // ============================================
  // FINAFORTE BRAND KLEUREN
  // ============================================
  const BRAND = {
    mint:       [0, 162, 170],    // #00A2AA
    mintDark:   [0, 41, 43],      // #00292B
    mintLight:  [240, 250, 249],  // #f0faf9
    mintDeep:   [0, 61, 64],      // #003D40
    copper:     [183, 134, 82],   // #b78652 (uniforme warm-accent met landingpage tokens)
    orange:     [242, 142, 24],   // #F28E18 (legacy — niet meer gebruikt in CTA)
    orangeSoft: [246, 167, 91],   // #F6A75B (legacy)
    black:      [0, 0, 0],
    white:      [255, 255, 255],
    darkGrey:   [45, 45, 45],     // #2D2D2D
    grey:       [102, 102, 102],
    lightGrey:  [230, 230, 230],
  };

  // Finaforte logo (120x120 PNG, base64)
  const LOGO_BASE64 = 'data:image/png;base64,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';

  // jsPDF + autoTable moeten via <script> tags in de HTML geladen worden:
  // <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"></script>
  // <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>

  function ensureLibraries() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('jsPDF library niet gevonden. Voeg de jsPDF script tags toe aan je HTML.');
    }
  }

  // ============================================
  // HELPER FUNCTIES
  // ============================================
  function formatCurrency(amount) {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  }

  function formatPercent(pct) {
    return pct.toFixed(1) + '%';
  }

  function formatDate() {
    return new Date().toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // ============================================
  // PDF GENERATOR
  // ============================================

  /**
   * Genereer een Finaforte PDF rapport
   *
   * @param {Object} config
   * @param {string} config.calculatorName - Naam van de calculator (bijv. "Salaris vs. Dividend")
   * @param {string} config.subtitle - Ondertitel (bijv. "Optimale salaris/dividend verdeling 2026")
   * @param {Array<{label: string, value: string}>} config.keyMetrics - Hoofd-metrics boven de tabel
   * @param {Object} config.table - Tabeldata
   * @param {string[]} config.table.headers - Kolomkoppen
   * @param {string[][]} config.table.rows - Rijen met data
   * @param {number} [config.table.optimalColumn] - Index van de optimale kolom (0-based, excl. label kolom)
   * @param {string[]} [config.highlights] - Belangrijke overwegingen / tips
   * @param {Object} [config.inputSummary] - Samenvatting van de invoer
   * @param {string} config.inputSummary.label - Label (bijv. "Bruto winst BV")
   * @param {string} config.inputSummary.value - Waarde (bijv. "€150.000")
   */
  async function generateFinafortePDF(config) {
    // Token toegangscontrole
    if (!window.FinaforteAccess || !window.FinaforteAccess.isValid) {
      alert('Je sessie is verlopen of ongeldig. Neem contact op met je adviseur voor een nieuwe toegangslink.');
      return;
    }

    ensureLibraries();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();   // 210
    const pageHeight = doc.internal.pageSize.getHeight();  // 297
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let y = 0;

    // Helper: veilige string (voorkom undefined/null in jsPDF.text)
    const safe = (val) => String(val != null ? val : '');

    // ── HEADER BAR ──────────────────────────────
    doc.setFillColor(...BRAND.mint);
    doc.rect(0, 0, pageWidth, 52, 'F');

    // Logo tekst (betrouwbaarder dan base64 image in jsPDF)
    doc.setFontSize(26);
    doc.setTextColor(...BRAND.white);
    doc.setFont('helvetica', 'bold');
    doc.text('Finaforte', margin, 32);

    // Datum rechts
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.white);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(), pageWidth - margin, 18, { align: 'right' });

    // Website
    doc.setFontSize(9);
    doc.text('www.finaforte.nl', pageWidth - margin, 25, { align: 'right' });

    // Rapport type
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255, 180);
    doc.text('PERSOONLIJK RAPPORT', pageWidth - margin, 40, { align: 'right' });

    y = 64;

    // ── TITEL ───────────────────────────────────
    doc.setFontSize(22);
    doc.setTextColor(...BRAND.darkGrey);
    doc.setFont('helvetica', 'bold');
    doc.text(safe(config.calculatorName), margin, y);
    y += 8;

    if (config.subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(...BRAND.grey);
      doc.setFont('helvetica', 'normal');
      doc.text(safe(config.subtitle), margin, y);
      y += 6;
    }

    // Oranje lijn onder titel
    doc.setDrawColor(...BRAND.orange);
    doc.setLineWidth(1.5);
    doc.line(margin, y, margin + 40, y);
    y += 10;

    // ── INVOER SAMENVATTING ────────────────────
    if (config.inputSummary) {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
      doc.setFontSize(10);

      if (typeof config.inputSummary === 'string') {
        // String format: toon als enkele regel
        doc.setTextColor(...BRAND.darkGrey);
        doc.setFont('helvetica', 'normal');
        doc.text(safe(config.inputSummary), margin + 6, y + 9);
      } else {
        // Object format: {label, value}
        doc.setTextColor(...BRAND.grey);
        doc.setFont('helvetica', 'normal');
        doc.text(safe(config.inputSummary.label) + ':', margin + 6, y + 9);
        doc.setTextColor(...BRAND.darkGrey);
        doc.setFont('helvetica', 'bold');
        doc.text(safe(config.inputSummary.value), margin + 60, y + 9);
      }
      y += 20;
    }

    // ── KEY METRICS (2-koloms layout voor betere leesbaarheid) ────
    if (config.keyMetrics && config.keyMetrics.length > 0) {
      const numMetrics = config.keyMetrics.length;
      const cols = Math.min(numMetrics, 2);
      const rows = Math.ceil(numMetrics / cols);
      const gap = 4;
      const metricWidth = (contentWidth - (cols - 1) * gap) / cols;
      const metricHeight = 22;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (idx >= numMetrics) break;
          const metric = config.keyMetrics[idx];
          const x = margin + c * (metricWidth + gap);
          const val = safe(metric.value);
          const label = safe(metric.label);

          // Achtergrond
          if (idx === 0) {
            doc.setFillColor(...BRAND.mint);
          } else {
            doc.setFillColor(...BRAND.mintLight);
          }
          doc.roundedRect(x, y, metricWidth, metricHeight, 3, 3, 'F');

          // Label links
          doc.setFontSize(8);
          doc.setTextColor(idx === 0 ? 255 : BRAND.grey[0], idx === 0 ? 255 : BRAND.grey[1], idx === 0 ? 255 : BRAND.grey[2]);
          doc.setFont('helvetica', 'normal');
          doc.text(label.toUpperCase(), x + 6, y + metricHeight / 2 + 1, { baseline: 'middle' });

          // Waarde rechts
          doc.setFontSize(14);
          doc.setTextColor(idx === 0 ? 255 : BRAND.mint[0], idx === 0 ? 255 : BRAND.mint[1], idx === 0 ? 255 : BRAND.mint[2]);
          doc.setFont('helvetica', 'bold');
          doc.text(val, x + metricWidth - 6, y + metricHeight / 2 + 1, { align: 'right', baseline: 'middle' });
        }
        y += metricHeight + gap;
      }

      y += 4;
    }

    // ── VERGELIJKINGSTABEL ──────────────────────
    if (config.table) {
      doc.setFontSize(13);
      doc.setTextColor(...BRAND.darkGrey);
      doc.setFont('helvetica', 'bold');
      doc.text('Vergelijking scenario\'s', margin, y);
      y += 6;

      const optCol = config.table.optimalColumn;

      // Kolom breedtes: label kolom smaller, data kolommen gelijk
      const numDataCols = config.table.headers.length - 1;
      const labelColWidth = 32;
      const dataColWidth = (contentWidth - labelColWidth) / numDataCols;
      const colStyles = { 0: { cellWidth: labelColWidth, halign: 'left' } };
      for (let ci = 1; ci <= numDataCols; ci++) {
        colStyles[ci] = { cellWidth: dataColWidth, halign: 'right' };
      }
      // Optimale kolom highlight
      if (optCol !== undefined) {
        colStyles[optCol + 1] = {
          ...colStyles[optCol + 1],
          fillColor: BRAND.mintLight,
          textColor: BRAND.mint,
          fontStyle: 'bold',
        };
      }

      doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [config.table.headers],
        body: config.table.rows,
        theme: 'grid',
        styles: {
          fontSize: 8.5,
          cellPadding: 3.5,
          lineColor: [230, 230, 230],
          lineWidth: 0.3,
          textColor: BRAND.darkGrey,
          font: 'helvetica',
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: BRAND.mint,
          textColor: BRAND.white,
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'right',
        },
        columnStyles: colStyles,
        didParseCell: function(data) {
          // Maak negatieve bedragen rood
          if (data.section === 'body' && data.cell.raw && typeof data.cell.raw === 'string') {
            const raw = data.cell.raw;
            // Rijen met belasting
            const row = data.row.index;
            const isNegativeRow = config.table.negativeRows && config.table.negativeRows.includes(row);
            if (isNegativeRow && data.column.index > 0) {
              data.cell.styles.textColor = [197, 48, 48]; // rood
            }
            // Highlight rij (netto)
            const isHighlightRow = config.table.highlightRows && config.table.highlightRows.includes(row);
            if (isHighlightRow && data.column.index > 0) {
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      y = doc.lastAutoTable.finalY + 8;
    }

    // ── BELANGRIJKE OVERWEGINGEN ────────────────
    if (config.highlights && config.highlights.length > 0) {
      // Check of we nog genoeg ruimte hebben
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 20;
      }

      // Mintgroene zijlijn box
      doc.setFillColor(240, 250, 249);
      const boxHeight = 12 + config.highlights.length * 7;
      doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'F');
      doc.setFillColor(...BRAND.mint);
      doc.rect(margin, y, 3, boxHeight, 'F');

      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.mint);
      doc.setFont('helvetica', 'bold');
      doc.text('Belangrijke overwegingen', margin + 8, y);
      y += 6;

      doc.setFontSize(9);
      doc.setTextColor(...BRAND.darkGrey);
      doc.setFont('helvetica', 'normal');
      config.highlights.forEach((tip) => {
        doc.text('\u2022  ' + safe(tip), margin + 8, y);
        y += 6;
      });
      y += 4;
    }

    // ── CTA SECTION ─────────────────────────────
    if (y > pageHeight - 55) {
      doc.addPage();
      y = 20;
    }

    // Funnel CTA blok — mint-deep gradient look, copper accent. Uniform met
    // landingpage gold-action card. Klikbare URL naar /scan/ met UTM-attribution.
    doc.setFillColor(...BRAND.mintDeep);
    doc.roundedRect(margin, y, contentWidth, 42, 4, 4, 'F');

    doc.setFontSize(14);
    doc.setTextColor(...BRAND.white);
    doc.setFont('helvetica', 'bold');
    doc.text('Wil je weten wat dit voor jouw plan betekent?', margin + contentWidth / 2, y + 13, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(...BRAND.copper);
    doc.setFont('helvetica', 'bold');
    var scanUrl = 'https://masterplan.finaforte.nl/scan/?utm_source=calc-pdf&utm_medium=pdf-cta';
    var scanLabel = 'Start de gratis scan (5 min) →';
    doc.textWithLink(scanLabel, margin + contentWidth / 2, y + 24, { align: 'center', url: scanUrl });

    doc.setFontSize(9);
    doc.setTextColor(...BRAND.white);
    doc.setFont('helvetica', 'normal');
    doc.text('Of bel direct: 085-0074080  •  finaforte.nl', margin + contentWidth / 2, y + 34, { align: 'center' });

    // ── FOOTER ──────────────────────────────────
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Dit rapport is indicatief en gebaseerd op fiscale parameters 2026. Raadpleeg een adviseur voor persoonlijk advies. \u00A9 ' + new Date().getFullYear() + ' Finaforte Financial Planning',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );

    // ── DOWNLOADEN ──────────────────────────────
    const filename = 'Finaforte-' + config.calculatorName.replace(/[^a-zA-Z0-9]/g, '-') + '-Rapport.pdf';
    doc.save(filename);
  }

  // Exporteer naar window
  window.FinafortePDF = { generate: generateFinafortePDF };

})();
