/**
 * LeadsBlender Integration voor Finaforte Calculators
 * Stuurt leads naar LeadsBlender/GoHighLevel CRM
 */

const LEADSBLENDER_CONFIG = {
  apiKey: 'pit-7757f9ca-e8f9-4f55-b76f-7e19970e1d8a',
  locationId: 'yVLWP9Pt9pp0kdXpY8R3',
  apiUrl: 'https://services.leadconnectorhq.com/contacts/'
};

/**
 * Stuurt een lead naar LeadsBlender
 * @param {Object} leadData - De lead gegevens
 * @param {string} leadData.naam - Volledige naam
 * @param {string} leadData.email - Email adres
 * @param {string} leadData.telefoon - Telefoonnummer (optioneel)
 * @param {string} leadData.calculator - Naam van de calculator
 * @param {Object} leadData.resultaten - Calculator resultaten
 * @returns {Promise} - Response van de API
 */
async function sendToLeadsBlender(leadData) {
  // Splits naam in voor- en achternaam
  const nameParts = leadData.naam.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Bouw het contact object voor LeadsBlender/GHL API
  const contact = {
    locationId: LEADSBLENDER_CONFIG.locationId,
    firstName: firstName,
    lastName: lastName,
    email: leadData.email,
    phone: leadData.telefoon || '',
    source: 'Finaforte Calculator',
    tags: [
      'Calculator Lead',
      `Calculator: ${leadData.calculator}`
    ],
    customFields: []
  };

  // Voeg calculator resultaten toe als custom fields/notes
  if (leadData.resultaten) {
    // Maak een geformatteerde string van de resultaten
    const resultatenText = Object.entries(leadData.resultaten)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    contact.notes = `Calculator: ${leadData.calculator}\n\nResultaten:\n${resultatenText}\n\nIngevuld op: ${new Date().toLocaleString('nl-NL')}`;
  }

  try {
    const response = await fetch(LEADSBLENDER_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEADSBLENDER_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(contact)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Lead succesvol verstuurd naar LeadsBlender:', result);
    return { success: true, data: result };

  } catch (error) {
    console.error('Fout bij versturen naar LeadsBlender:', error);

    // Fallback: probeer via webhook als directe API faalt (CORS)
    return sendViaWebhook(leadData);
  }
}

/**
 * Fallback: Stuur via een server-side webhook
 * Dit voorkomt CORS problemen bij client-side requests
 */
async function sendViaWebhook(leadData) {
  // LeadsBlender/GHL Inbound Webhook URL
  // Deze moet je aanmaken in LeadsBlender > Settings > Integrations > Webhooks
  const webhookUrl = 'https://services.leadconnectorhq.com/hooks/' + LEADSBLENDER_CONFIG.locationId + '/webhook-trigger';

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // Voorkomt CORS errors
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        naam: leadData.naam,
        email: leadData.email,
        telefoon: leadData.telefoon || '',
        calculator: leadData.calculator,
        resultaten: JSON.stringify(leadData.resultaten),
        bron: 'Finaforte Mini-Calculator',
        timestamp: new Date().toISOString()
      })
    });

    return { success: true, message: 'Verstuurd via webhook' };

  } catch (error) {
    console.error('Webhook fout:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Utility functie om lead formulier te tonen in calculator
 * @param {string} calculatorName - Naam van de calculator
 * @param {Object} resultaten - De berekende resultaten
 * @param {Function} onSuccess - Callback bij succes
 */
function showLeadCaptureForm(calculatorName, resultaten, onSuccess) {
  // Maak modal HTML
  const modalHTML = `
    <div id="leadModal" style="
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
    ">
      <div style="
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 450px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <h3 style="color: #00A2AA; margin: 0 0 8px 0; font-size: 24px;">
          📊 Je resultaten zijn klaar!
        </h3>
        <p style="color: #666; margin: 0 0 24px 0; font-size: 14px;">
          Vul je gegevens in om de resultaten te ontvangen en persoonlijk advies te krijgen.
        </p>
        <form id="leadCaptureForm">
          <div style="margin-bottom: 16px;">
            <input type="text" id="leadNaam" placeholder="Je naam" required style="
              width: 100%;
              padding: 14px 18px;
              border: 2px solid #e5e5e5;
              border-radius: 10px;
              font-size: 16px;
              box-sizing: border-box;
            ">
          </div>
          <div style="margin-bottom: 16px;">
            <input type="email" id="leadEmail" placeholder="je@email.nl" required style="
              width: 100%;
              padding: 14px 18px;
              border: 2px solid #e5e5e5;
              border-radius: 10px;
              font-size: 16px;
              box-sizing: border-box;
            ">
          </div>
          <div style="margin-bottom: 16px;">
            <input type="tel" id="leadTelefoon" placeholder="Telefoonnummer (optioneel)" style="
              width: 100%;
              padding: 14px 18px;
              border: 2px solid #e5e5e5;
              border-radius: 10px;
              font-size: 16px;
              box-sizing: border-box;
            ">
          </div>
          <button type="submit" id="leadSubmitBtn" style="
            width: 100%;
            padding: 16px;
            background: #F28E18;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
          ">
            Ontvang Resultaten →
          </button>
        </form>
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 16px;">
          🔒 Je gegevens zijn veilig. We nemen binnen 24 uur contact op.
        </p>
        <button onclick="document.getElementById('leadModal').remove()" style="
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
        ">×</button>
      </div>
    </div>
  `;

  // Voeg modal toe aan pagina
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Handle form submit
  document.getElementById('leadCaptureForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('leadSubmitBtn');
    btn.textContent = 'Verzenden...';
    btn.disabled = true;

    const leadData = {
      naam: document.getElementById('leadNaam').value,
      email: document.getElementById('leadEmail').value,
      telefoon: document.getElementById('leadTelefoon').value,
      calculator: calculatorName,
      resultaten: resultaten
    };

    const result = await sendToLeadsBlender(leadData);

    if (result.success) {
      btn.textContent = '✓ Verstuurd!';
      btn.style.background = '#00A2AA';

      setTimeout(() => {
        document.getElementById('leadModal').remove();
        if (onSuccess) onSuccess(leadData);
      }, 1500);
    } else {
      btn.textContent = 'Probeer opnieuw';
      btn.disabled = false;
      btn.style.background = '#F28E18';
    }
  });
}

// Exporteer functies voor gebruik in calculators
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sendToLeadsBlender, showLeadCaptureForm };
}
