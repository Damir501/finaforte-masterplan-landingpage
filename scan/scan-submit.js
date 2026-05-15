/**
 * Scan-submit: bouwt Brevo-payload uit scan-state en POST naar webhook-endpoint.
 * Vereist scan-state.js + scan-scoring.js + scan-fingerprint.js geladen vóór dit script.
 *
 * Fase C — endpoint is /api/brevo-scan-completion.php (PHP-proxy naar Brevo, server-side
 * BREVO_API_KEY). Submit-failure blijft fail-soft: rapport-redirect gaat altijd door,
 * falen logt naar GoatCounter event.
 */
(function() {
  'use strict';

  var WEBHOOK_URL = '/api/brevo-scan-completion.php';
  var WEBHOOK_TIMEOUT_MS = 6000;

  /**
   * 13-domein scores → 3-domein scores (S/D, Box3, Pensioen) volgens spec v1.1 §4.
   * Clamped op MIN(10, raw) zodat cutoffs rood ≥7 / geel 4–6.9 / groen <4 werken.
   */
  function mapTo3Domain(scores) {
    var sd  = (scores.salaris_dividend || 0);
    var b3  = (scores.box3_2028 || 0) + (scores.box3_optimizer || 0);
    var pg  = (scores.pensioengat || 0) + (scores.peb_odv_lijfrente || 0);
    return {
      sd:       Math.min(10, sd),
      box3:     Math.min(10, b3),
      pensioen: Math.min(10, pg)
    };
  }

  function pickIntentTag(intentAnswer) {
    var map = {
      self: 'intent-self',
      accountant: 'intent-accountant',
      second_opinion: 'intent-second-opinion',
      routekaart: 'intent-routekaart'
    };
    return map[intentAnswer] || 'intent-unknown';
  }

  function pickProfileTag(profile) {
    if (profile === 'dga' || profile === 'combinatie') return 'profiel-dga';
    if (profile === 'zzp') return 'profiel-zzp';
    if (profile === 'particulier') return 'profiel-particulier';
    return 'profiel-onbekend';
  }

  function readUtmFromUrl() {
    var out = {};
    try {
      var u = new URL(window.location.href);
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k) {
        var v = u.searchParams.get(k);
        if (v) out[k.toUpperCase()] = v;
      });
    } catch (e) {}
    return out;
  }

  function buildPayload(formData, state, scores, top3Hash) {
    var mapped = mapTo3Domain(scores);
    var rapportUrl = window.location.origin + '/rapport/?p=' + top3Hash;
    var attrs = {
      DOMINANTE_ZORG: state.answers.q12_zorg || null,
      SCORE_SD: mapped.sd,
      SCORE_BOX3: mapped.box3,
      SCORE_PENSIOEN: mapped.pensioen,
      TOP3_HASH: top3Hash,
      RAPPORT_URL: rapportUrl,
      SCAN_COMPLETED_AT: new Date().toISOString(),
      SCAN_STARTED_AT: state.startedAt ? new Date(state.startedAt).toISOString() : null
    };
    var utm = readUtmFromUrl();
    Object.keys(utm).forEach(function(k) { attrs[k] = utm[k]; });

    return {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      tags: [
        'scan-completed',
        pickProfileTag(state.profile),
        pickIntentTag(state.answers.q13_intent)
      ],
      attributes: attrs
    };
  }

  function trackEvent(name, params) {
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: name, event: true });
      }
      if (window.console && console.info) {
        console.info('[scan-submit]', name, params || {});
      }
    } catch (e) {}
  }

  /**
   * Best-effort POST naar webhook. Bij failure of timeout: fail-soft (logt event,
   * blokkeert rapport-redirect niet). Echte Brevo-wire-up gebeurt in Fase C.
   */
  function postToWebhook(payload) {
    return new Promise(function(resolve) {
      var done = false;
      var finish = function(ok, reason) {
        if (done) return;
        done = true;
        trackEvent(ok ? 'scan-submit-ok' : 'scan-submit-fail', { reason: reason });
        resolve({ ok: ok, reason: reason });
      };

      var timer = setTimeout(function() { finish(false, 'timeout'); }, WEBHOOK_TIMEOUT_MS);

      try {
        if (typeof window.fetch !== 'function') {
          clearTimeout(timer);
          finish(false, 'no-fetch');
          return;
        }
        window.fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'omit',
          mode: 'cors',
          keepalive: true
        }).then(function(res) {
          clearTimeout(timer);
          if (res && (res.ok || res.status === 202)) finish(true, 'http-' + res.status);
          else finish(false, 'http-' + (res ? res.status : 'unknown'));
        }).catch(function(err) {
          clearTimeout(timer);
          finish(false, 'fetch-error');
        });
      } catch (e) {
        clearTimeout(timer);
        finish(false, 'exception');
      }
    });
  }

  /**
   * Submit-orchestrator: bouwt payload, postet, en geeft een Promise die
   * altijd resolved (geen rejects). Caller doet redirect ongeacht uitkomst.
   */
  function submit(formData, state) {
    var scores = window.ScanScoring.calculateScores(state.answers);
    var top3 = window.ScanScoring.getTop3(scores);
    var hash = window.ScanFingerprint.encode(top3);
    var payload = buildPayload(formData, state, scores, hash);

    // Funnel auto-unlock: zelfde sessionStorage-sleutel die token-guard.js
    // gebruikt, zodat een scan-voltooier geen tweede email-gate krijgt
    // op een calc. Sluit het funnel-gat tussen /scan/ en /Mini-Calculators/.
    try { sessionStorage.setItem('ff_email_access', formData.email); } catch (e) {}

    if (window.console && console.info) {
      console.info('[scan-submit] payload', payload);
    }

    return postToWebhook(payload).then(function(result) {
      return { hash: hash, payload: payload, submission: result };
    });
  }

  window.ScanSubmit = {
    submit: submit,
    buildPayload: buildPayload,
    mapTo3Domain: mapTo3Domain,
    WEBHOOK_URL: WEBHOOK_URL
  };
})();
