/**
 * Rapport: decodeert ?p=<hash>, rendert top-3 architect-titels uit ARCHITECT.domeinen.
 * Bij geen hash: redirect naar /v2/scan/ (gebruiker hoort daar te beginnen).
 */
(function() {
  'use strict';

  var MAIN_ID = 'rapport-main';
  var OPENER_ID = 'rapport-opener';
  var CTA_PRIMARY_ID = 'cta-primary';
  var SECONDARY_FORM_ID = 'cta-secondary';

  function $(id) { return document.getElementById(id); }

  function getHash() {
    var p = new URLSearchParams(location.search).get('p');
    return p || '';
  }

  function renderDomain(domainId, index) {
    var data = window.ARCHITECT.domeinen[domainId];
    if (!data) {
      console.warn('Onbekend domein:', domainId);
      return null;
    }
    var section = document.createElement('section');
    section.className = 'rapport-vlek rapport-vlek-' + (index + 1);
    section.setAttribute('data-domain', domainId);

    var header = document.createElement('header');
    var nr = document.createElement('span');
    nr.className = 'rapport-vlek-nr';
    nr.textContent = String(index + 1);
    header.appendChild(nr);
    var title = document.createElement('h2');
    title.className = 'rapport-vlek-title';
    title.textContent = data.title;
    header.appendChild(title);
    section.appendChild(header);

    var body = document.createElement('p');
    body.className = 'rapport-vlek-uitleg';
    body.textContent = data.uitleg;
    section.appendChild(body);

    var video = document.createElement('div');
    video.className = 'rapport-vlek-video';
    video.innerHTML = '<div class="video-placeholder">' +
      '<svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M10 8 L16 12 L10 16 Z" fill="currentColor"/></svg>' +
      '<p>' + window.ARCHITECT.rapport.video_placeholder + '</p></div>';
    section.appendChild(video);

    var link = document.createElement('a');
    link.className = 'rapport-vlek-link';
    link.href = data.calculator_path;
    link.textContent = data.calculator_label;
    section.appendChild(link);

    return section;
  }

  function renderTop3(domainIds) {
    var main = $(MAIN_ID);
    if (!main) return;
    main.innerHTML = '';
    domainIds.forEach(function(id, idx) {
      var sec = renderDomain(id, idx);
      if (sec) main.appendChild(sec);
    });
  }

  function setStaticCopy() {
    var op = $(OPENER_ID);
    if (op) op.textContent = window.ARCHITECT.rapport.opener;
    var pr = $(CTA_PRIMARY_ID);
    if (pr) pr.textContent = window.ARCHITECT.rapport.cta_primary;
    var form = $(SECONDARY_FORM_ID);
    if (form) {
      var btn = form.querySelector('button');
      if (btn) btn.textContent = window.ARCHITECT.rapport.cta_secondary;
    }
  }

  function attachSecondaryHandler() {
    var form = $(SECONDARY_FORM_ID);
    if (!form) return;
    var renderedAt = Date.now();
    form.addEventListener('submit', function(ev) {
      ev.preventDefault();
      var honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) return;
      if (Date.now() - renderedAt < 5000) {
        form.classList.add('too-fast');
        return;
      }
      var email = form.querySelector('input[name="email"]').value;
      var p = getHash();
      var data = new FormData();
      data.append('email', email);
      data.append('Pagina', 'v2/rapport');
      data.append('Hash', p);
      data.append('Datum', new Date().toISOString());
      data.append('_subject', 'Rapport-aanvraag v2 (' + p.substring(0, 12) + ')');
      data.append('_template', 'table');
      fetch(form.action, { method: 'POST', body: data, mode: 'no-cors' })
        .then(function() {
          form.classList.add('submitted');
          form.innerHTML = '<p class="form-thanks">Bedankt. Het rapport komt binnen 2 minuten in uw inbox.</p>';
        })
        .catch(function() {
          form.classList.add('error');
        });
    });
  }

  function init() {
    if (!window.ARCHITECT || !window.ScanFingerprint) {
      console.error('rapport: dependencies missing');
      return;
    }
    setStaticCopy();
    var hash = getHash();
    if (!hash) {
      location.href = '/v2/scan/';
      return;
    }
    var domains = window.ScanFingerprint.decode(hash);
    if (!Array.isArray(domains) || domains.length === 0) {
      var main = $(MAIN_ID);
      if (main) {
        main.innerHTML = '<p class="rapport-error">Het rapport-link is niet (meer) leesbaar. ' +
          '<a href="/v2/scan/">Doe de scan opnieuw.</a></p>';
      }
      return;
    }
    renderTop3(domains);
    attachSecondaryHandler();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
