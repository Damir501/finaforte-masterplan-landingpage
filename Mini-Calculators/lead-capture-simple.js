/**
 * Finaforte Simpele Lead Capture
 * Stuurt lead gegevens via email formulier
 * Werkt met alle calculators
 */

const FINAFORTE_LEAD_CONFIG = {
  emailTo: 'd.tvrtkovic@finaforte.nl',
  companyName: 'Finaforte',
  brandColor: '#1AABA6',
  accentColor: '#F28E18'
};

/**
 * Toon lead capture modal na berekening
 * @param {string} calculatorName - Naam van de calculator
 * @param {Object} resultaten - De berekende resultaten
 * @param {Function} onSuccess - Callback bij succes (optioneel)
 */
function showLeadCapture(calculatorName, resultaten, onSuccess) {
  // Verwijder bestaande modal als die er is
  const existing = document.getElementById('finaforteLeadModal');
  if (existing) existing.remove();

  // Format resultaten voor email
  const resultatenText = Object.entries(resultaten)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const emailSubject = encodeURIComponent(`Calculator Lead: ${calculatorName}`);
  const emailBody = encodeURIComponent(`
NIEUWE CALCULATOR LEAD
======================
Calculator: ${calculatorName}
Datum: ${new Date().toLocaleString('nl-NL')}

RESULTATEN:
${resultatenText}

---
Vul hieronder je gegevens in:

Naam: [INVULLEN]
Email: [INVULLEN]
Telefoon: [INVULLEN]

Bron: ${window.location.href}
  `);

  const modalHTML = `
    <div id="finaforteLeadModal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,41,43,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      box-sizing: border-box;
    ">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        position: relative;
        max-height: 90vh;
        overflow-y: auto;
      ">
        <button onclick="document.getElementById('finaforteLeadModal').remove()" style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #999;
          line-height: 1;
        ">&times;</button>

        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">📊</div>
          <h3 style="color: ${FINAFORTE_LEAD_CONFIG.brandColor}; margin: 0 0 8px 0; font-size: 22px;">
            Je berekening is klaar!
          </h3>
          <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.5;">
            Wil je deze resultaten bewaren en persoonlijk advies ontvangen?
          </p>
        </div>

        <form id="leadCaptureForm" style="margin-bottom: 16px;">
          <input type="text" id="leadNaam" placeholder="Je naam" required style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5e5;
            border-radius: 10px;
            font-size: 16px;
            margin-bottom: 12px;
            box-sizing: border-box;
          ">
          <input type="email" id="leadEmail" placeholder="je@email.nl" required style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5e5;
            border-radius: 10px;
            font-size: 16px;
            margin-bottom: 12px;
            box-sizing: border-box;
          ">
          <input type="tel" id="leadTelefoon" placeholder="Telefoonnummer (optioneel)" style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5e5;
            border-radius: 10px;
            font-size: 16px;
            margin-bottom: 16px;
            box-sizing: border-box;
          ">
          <button type="submit" id="leadSubmitBtn" style="
            width: 100%;
            padding: 16px;
            background: ${FINAFORTE_LEAD_CONFIG.accentColor};
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.1s, background 0.2s;
          ">
            Ontvang Persoonlijk Advies →
          </button>
        </form>

        <p style="text-align: center; font-size: 12px; color: #999; margin: 0;">
          🔒 Je gegevens zijn veilig. We nemen binnen 24 uur contact op.
        </p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Form submit handler
  document.getElementById('leadCaptureForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const btn = document.getElementById('leadSubmitBtn');
    const naam = document.getElementById('leadNaam').value;
    const email = document.getElementById('leadEmail').value;
    const telefoon = document.getElementById('leadTelefoon').value;

    btn.textContent = 'Verzenden...';
    btn.disabled = true;

    // Verstuur lead via FormSubmit (gratis email service)
    sendLeadEmail({
      naam,
      email,
      telefoon,
      calculator: calculatorName,
      resultaten,
      url: window.location.href
    }).then(() => {
      // Toon success
      btn.textContent = '✓ Verstuurd!';
      btn.style.background = FINAFORTE_LEAD_CONFIG.brandColor;

      setTimeout(() => {
        document.getElementById('finaforteLeadModal').remove();
        if (onSuccess) onSuccess({ naam, email, telefoon });
      }, 1500);
    }).catch(() => {
      // Fallback: open mailto
      openMailtoFallback(calculatorName, resultaten, naam, email, telefoon);
      btn.textContent = '✓ Email geopend!';
      btn.style.background = FINAFORTE_LEAD_CONFIG.brandColor;

      setTimeout(() => {
        document.getElementById('finaforteLeadModal').remove();
        if (onSuccess) onSuccess({ naam, email, telefoon });
      }, 1500);
    });
  });
}

/**
 * Verstuur lead via FormSubmit service (gratis, geen server nodig)
 */
async function sendLeadEmail(leadData) {
  const formData = new FormData();
  formData.append('_subject', `📊 Nieuwe Lead: ${leadData.calculator}`);
  formData.append('_template', 'table');
  formData.append('_captcha', 'false');

  formData.append('Calculator', leadData.calculator);
  formData.append('Naam', leadData.naam);
  formData.append('Email', leadData.email);
  formData.append('Telefoon', leadData.telefoon || 'Niet ingevuld');
  formData.append('Datum', new Date().toLocaleString('nl-NL'));
  formData.append('Pagina', leadData.url);

  // Resultaten toevoegen
  Object.entries(leadData.resultaten).forEach(([key, value]) => {
    formData.append(key, value);
  });

  // FormSubmit.co - gratis email service
  const response = await fetch(`https://formsubmit.co/ajax/${FINAFORTE_LEAD_CONFIG.emailTo}`, {
    method: 'POST',
    body: formData,
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) throw new Error('Email failed');
  return response.json();
}

/**
 * Fallback: open mailto link
 */
function openMailtoFallback(calculator, resultaten, naam, email, telefoon) {
  const resultatenText = Object.entries(resultaten)
    .map(([key, value]) => `• ${key}: ${value}`)
    .join('%0A');

  const subject = encodeURIComponent(`Nieuwe Calculator Lead: ${calculator}`);
  const body = encodeURIComponent(`
NIEUWE CALCULATOR LEAD
======================

Calculator: ${calculator}
Datum: ${new Date().toLocaleString('nl-NL')}

KLANTGEGEVENS:
• Naam: ${naam}
• Email: ${email}
• Telefoon: ${telefoon || 'Niet ingevuld'}

RESULTATEN:
`) + resultatenText + encodeURIComponent(`

---
Bron: ${window.location.href}
`);

  window.open(`mailto:${FINAFORTE_LEAD_CONFIG.emailTo}?subject=${subject}&body=${body}`, '_blank');
}

/**
 * Utility: Toon lead form na X seconden of bij bepaalde actie
 * @param {string} calculatorName
 * @param {Function} getResultaten - Functie die huidige resultaten teruggeeft
 * @param {number} delaySeconds - Wacht X seconden (optioneel)
 */
function setupAutoLeadCapture(calculatorName, getResultaten, delaySeconds = 0) {
  if (delaySeconds > 0) {
    setTimeout(() => {
      const resultaten = getResultaten();
      if (resultaten) showLeadCapture(calculatorName, resultaten);
    }, delaySeconds * 1000);
  }
}

// Export voor gebruik in calculators
if (typeof window !== 'undefined') {
  window.FinaforteLead = {
    show: showLeadCapture,
    setupAuto: setupAutoLeadCapture,
    config: FINAFORTE_LEAD_CONFIG
  };
}
