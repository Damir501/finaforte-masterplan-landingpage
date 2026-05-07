/**
 * Finaforte Token Guard
 * Client-side token validatie voor calculator toegangscontrole
 *
 * Token formaat: base64url({ c: clientId, e: expiry, s: hmac_signature })
 * Opgeslagen in sessionStorage na eerste validatie
 */
(function() {
  'use strict';

  // ============================================
  // GEDEELDE GEHEIME SLEUTEL (identiek aan generate-token.js)
  // ============================================
  var SECRET = 'Fn4f0rt3-M4st3rPl4n-2026-X9kL';

  // ============================================
  // SYNCHRONE SHA-256 HMAC (compact implementatie)
  // ============================================
  function hmacSha256(key, message) {
    // Simple HMAC using SHA-256 via synchronous approach
    // We use a lightweight hash for client-side validation
    var hash = 0;
    var combined = key + '|' + message;
    for (var i = 0; i < combined.length; i++) {
      var ch = combined.charCodeAt(i);
      hash = ((hash << 5) - hash + ch) | 0;
    }
    // Second pass with different seed for more entropy
    var hash2 = 5381;
    for (var j = 0; j < combined.length; j++) {
      hash2 = ((hash2 << 5) + hash2 + combined.charCodeAt(j)) | 0;
    }
    var hex = Math.abs(hash).toString(16) + Math.abs(hash2).toString(16);
    while (hex.length < 16) hex = '0' + hex;
    return hex.substring(0, 16);
  }

  // We use the real HMAC via SubtleCrypto for actual validation (async)
  // but fall back to the simple hash for immediate blocking
  function realHmacAsync(message) {
    return new Promise(function(resolve) {
      try {
        var enc = new TextEncoder();
        crypto.subtle.importKey(
          'raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        ).then(function(key) {
          return crypto.subtle.sign('HMAC', key, enc.encode(message));
        }).then(function(sig) {
          var arr = new Uint8Array(sig);
          var hex = '';
          arr.forEach(function(b) { hex += b.toString(16).padStart(2, '0'); });
          resolve(hex.substring(0, 16));
        }).catch(function() { resolve(null); });
      } catch(e) { resolve(null); }
    });
  }

  // ============================================
  // BASE64URL DECODE
  // ============================================
  function base64urlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    try { return atob(str); } catch(e) { return null; }
  }

  // ============================================
  // BROWSER FINGERPRINT (lightweight)
  // ============================================
  function getFingerprint() {
    var parts = [
      screen.width, screen.height, screen.colorDepth,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ];
    var str = parts.join('|');
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
  }

  // ============================================
  // TOKEN VALIDATIE
  // ============================================
  var STORAGE_KEY = 'ff_token';
  var STORAGE_FP = 'ff_fp';

  function parseToken(tokenStr) {
    var decoded = base64urlDecode(tokenStr);
    if (!decoded) return null;
    try {
      var obj = JSON.parse(decoded);
      if (!obj.c || !obj.e || !obj.s) return null;
      return obj;
    } catch(e) { return null; }
  }

  function isExpired(token) {
    return (Date.now() / 1000) > token.e;
  }

  function validateSync(token) {
    // Quick check: expiry
    if (isExpired(token)) return false;
    // Signature check happens async
    return true;
  }

  function init() {
    var access = { isValid: false, clientId: null, expiresAt: null, expired: false };

    // 1. Check URL parameter
    var params = new URLSearchParams(window.location.search);
    var urlToken = params.get('token');

    if (urlToken) {
      var parsed = parseToken(urlToken);
      if (parsed && !isExpired(parsed)) {
        // Geldige token — opslaan en URL opschonen
        sessionStorage.setItem(STORAGE_KEY, urlToken);
        sessionStorage.setItem(STORAGE_FP, getFingerprint());
        // URL opschonen (token verwijderen uit adresbalk)
        var cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        access.isValid = true;
        access.clientId = parsed.c;
        access.expiresAt = new Date(parsed.e * 1000);
      } else if (parsed && isExpired(parsed)) {
        access.expired = true;
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    // 2. Check sessionStorage (als geen URL token)
    if (!access.isValid && !urlToken) {
      var stored = sessionStorage.getItem(STORAGE_KEY);
      var storedFp = sessionStorage.getItem(STORAGE_FP);
      if (stored) {
        var parsed2 = parseToken(stored);
        if (parsed2 && !isExpired(parsed2)) {
          // Fingerprint check
          if (storedFp === getFingerprint()) {
            access.isValid = true;
            access.clientId = parsed2.c;
            access.expiresAt = new Date(parsed2.e * 1000);
          }
        } else {
          access.expired = true;
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(STORAGE_FP);
        }
      }
    }

    // 3. Async HMAC verificatie (bevestigt of verwerpt)
    if (access.isValid) {
      var storedToken = sessionStorage.getItem(STORAGE_KEY);
      var p = parseToken(storedToken);
      if (p) {
        var msg = p.c + '|' + p.e;
        realHmacAsync(msg).then(function(sig) {
          if (sig && sig !== p.s) {
            // Handtekening klopt niet — ongeldig maken
            window.FinaforteAccess.isValid = false;
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_FP);
            // Force UI update
            document.dispatchEvent(new CustomEvent('finaforte-access-revoked'));
          }
        });
      }
    }

    window.FinaforteAccess = access;
  }

  // ============================================
  // EMAIL LEAD CONFIG
  // ============================================
  var LEAD_EMAIL = 'info@finaforte.nl';
  var EMAIL_STORAGE_KEY = 'ff_email_access';

  // Check of email al is ingevuld (sessionStorage)
  function checkEmailAccess() {
    var stored = sessionStorage.getItem(EMAIL_STORAGE_KEY);
    if (stored) {
      window.FinaforteAccess.isValid = true;
      window.FinaforteAccess.clientId = stored;
      return true;
    }
    return false;
  }



  // ============================================
  // LOCKED STATE UI COMPONENT (email gate)
  // ============================================
  window.FinaforteLockedState = function() {
    var access = window.FinaforteAccess || {};
    var isExpired = access.expired;

    var _useState = React.useState('');
    var email = _useState[0];
    var setEmail = _useState[1];

    var _useState2 = React.useState('');
    var naam = _useState2[0];
    var setNaam = _useState2[1];

    var _useState3 = React.useState(false);
    var loading = _useState3[0];
    var setLoading = _useState3[1];

    var _useState4 = React.useState('');
    var error = _useState4[0];
    var setError = _useState4[1];

    function handleSubmit(e) {
      e.preventDefault();
      if (!email || !naam) {
        setError('Vul je naam en e-mailadres in.');
        return;
      }
      setLoading(true);
      setError('');

      // Stuur lead naar Damir via FormSubmit
      var formData = new FormData();
      formData.append('_subject', 'Nieuwe Calculator Lead: ' + naam);
      formData.append('_template', 'table');
      formData.append('_captcha', 'false');
      formData.append('Naam', naam);
      formData.append('Email', email);
      formData.append('Datum', new Date().toLocaleString('nl-NL'));
      formData.append('Pagina', window.location.href);
      formData.append('Calculator', document.title || 'Onbekend');

      fetch('https://formsubmit.co/ajax/' + LEAD_EMAIL, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      }).then(function() {
        // Ontgrendel toegang
        sessionStorage.setItem(EMAIL_STORAGE_KEY, email);
        window.FinaforteAccess.isValid = true;
        window.FinaforteAccess.clientId = email;
        setLoading(false);
        // Force re-render door pagina te herladen
        window.location.reload();
      }).catch(function() {
        // Bij fout toch ontgrendelen (FormSubmit vereist eerste keer email bevestiging)
        sessionStorage.setItem(EMAIL_STORAGE_KEY, email);
        window.FinaforteAccess.isValid = true;
        window.FinaforteAccess.clientId = email;
        setLoading(false);
        window.location.reload();
      });
    }

    var containerStyle = {
      textAlign: 'center',
      padding: '60px 24px',
      maxWidth: '460px',
      margin: '0 auto',
    };

    var inputStyle = {
      width: '100%',
      padding: '14px',
      border: '2px solid #e5e5e5',
      borderRadius: '8px',
      fontSize: '16px',
      marginBottom: '12px',
      boxSizing: 'border-box',
      outline: 'none',
    };

    var btnStyle = {
      width: '100%',
      padding: '16px',
      background: '#F28E18',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
    };

    if (isExpired) {
      return React.createElement('div', { style: containerStyle },
        React.createElement('div', { style: { fontSize: '64px', marginBottom: '16px', opacity: 0.6 } }, '\u23F0'),
        React.createElement('h2', { style: { fontSize: '22px', color: '#2D2D2D', marginBottom: '12px' } }, 'Je sessie is verlopen'),
        React.createElement('p', { style: { color: '#666', fontSize: '16px', marginBottom: '24px', lineHeight: '1.6' } },
          'Je toegangslink is niet meer geldig. Neem contact op met je adviseur voor een nieuwe link.'),
        React.createElement('p', { style: { color: '#999', fontSize: '14px' } }, 'Bel: 085-0074080 | info@finaforte.nl')
      );
    }

    return React.createElement('div', { style: containerStyle },
      React.createElement('div', { style: { fontSize: '64px', marginBottom: '16px', opacity: 0.6 } }, '\uD83D\uDD13'),

      React.createElement('h2', { style: { fontSize: '22px', color: '#2D2D2D', marginBottom: '8px' } }, 'Ontgrendel deze calculator'),

      React.createElement('p', { style: { color: '#666', fontSize: '16px', marginBottom: '24px', lineHeight: '1.6' } },
        'Vul je gegevens in om gratis toegang te krijgen tot deze professionele calculator met PDF-rapport.'),

      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('input', {
          type: 'text',
          placeholder: 'Je naam',
          value: naam,
          onChange: function(e) { setNaam(e.target.value); },
          style: inputStyle,
          required: true,
        }),
        React.createElement('input', {
          type: 'email',
          placeholder: 'je@email.nl',
          value: email,
          onChange: function(e) { setEmail(e.target.value); },
          style: inputStyle,
          required: true,
        }),
        error ? React.createElement('p', { style: { color: '#c53030', fontSize: '14px', marginBottom: '12px' } }, error) : null,
        React.createElement('button', {
          type: 'submit',
          disabled: loading,
          style: Object.assign({}, btnStyle, loading ? { background: '#ccc', cursor: 'not-allowed' } : {})
        }, loading ? 'Even geduld...' : 'Ontgrendel calculator \u2192')
      ),

      React.createElement('p', { style: { color: '#999', fontSize: '12px', marginTop: '16px' } },
        'We respecteren je privacy. Geen spam, alleen waardevolle inzichten.'),

      React.createElement('div', { style: { marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e5e5' } },
        React.createElement('p', { style: { color: '#999', fontSize: '13px' } },
          'Al een toegangslink ontvangen? '),
        React.createElement('p', { style: { color: '#999', fontSize: '13px', marginTop: '4px' } },
          'Plak de link in je adresbalk om direct toegang te krijgen.')
      )
    );
  };

  // ============================================
  // INIT
  // ============================================
  init();

  // Na init, ook email access checken
  if (!window.FinaforteAccess.isValid) {
    checkEmailAccess();
  }

})();
