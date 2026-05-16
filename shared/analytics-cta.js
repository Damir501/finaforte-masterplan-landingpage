(function () {
  'use strict';

  var TRACK_ENDPOINT = '/api/track.php';
  var VISITOR_KEY = 'ff_visitor_id';
  var SESSION_KEY = 'ff_session_id';

  function id(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
  }

  function getStoredId(storage, key, prefix) {
    try {
      var value = storage.getItem(key);
      if (!value) {
        value = id(prefix);
        storage.setItem(key, value);
      }
      return value;
    } catch (e) {
      return id(prefix);
    }
  }

  function utm() {
    var out = {};
    try {
      var params = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
        var value = params.get(key);
        if (value) out[key] = value;
      });
    } catch (e) {}
    return out;
  }

  function cleanText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  function pathWithSafeQuery() {
    try {
      var url = new URL(window.location.href);
      var keep = new URLSearchParams();
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'p'].forEach(function (key) {
        var value = url.searchParams.get(key);
        if (value) keep.set(key, value);
      });
      var query = keep.toString();
      return url.pathname + (query ? '?' + query : '');
    } catch (e) {
      return window.location.pathname || '';
    }
  }

  function send(eventName, properties) {
    if (!eventName) return;
    var payload = {
      event: eventName,
      path: pathWithSafeQuery(),
      referrer: document.referrer || '',
      visitor_id: getStoredId(window.localStorage, VISITOR_KEY, 'v'),
      session_id: getStoredId(window.sessionStorage, SESSION_KEY, 's'),
      properties: Object.assign({
        path: pathWithSafeQuery(),
        title: document.title || ''
      }, utm(), properties || {})
    };

    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(TRACK_ENDPOINT, blob)) return;
      }
    } catch (e) {}

    try {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        credentials: 'omit',
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function calcIdFromPath() {
    var match = (window.location.pathname || '').match(/\/Mini-Calculators\/(\d{2})_/);
    return match ? match[1] : null;
  }

  function trackPageContext() {
    send('page_view');
    var calcId = calcIdFromPath();
    if (calcId) {
      send('calculator_opened', {
        calc: calcId,
        calculator_title: document.title || ''
      });
    }
    if ((window.location.pathname || '').indexOf('/rapport/') === 0) {
      send('rapport_page_view');
    }
  }

  function trackGoatCounter(name) {
    if (typeof window.goatcounter !== 'undefined' &&
        typeof window.goatcounter.count === 'function') {
      window.goatcounter.count({ path: 'event-' + name, title: name, event: true });
    }
  }

  function clickProps(el, name) {
    var href = el.getAttribute('href') || '';
    return {
      cta: name,
      href: href,
      text: cleanText(el.textContent),
      calc: el.getAttribute('data-calc') || null,
      section: el.closest('section[id]') ? el.closest('section[id]').id : null
    };
  }

  function isCallClick(name, href) {
    return /kennismaking|calendly|call|gesprek/.test(name || '') ||
      /calendly\.com|\/kennismaking\//.test(href || '');
  }

  window.FinaforteTrack = send;

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (!el) return;
    var name = el.getAttribute('data-event');
    if (!name) return;

    var props = clickProps(el, name);
    trackGoatCounter(name);
    send('cta_click', props);
    if (isCallClick(name, props.href)) {
      send('call_clicked', props);
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageContext);
  } else {
    trackPageContext();
  }
})();
