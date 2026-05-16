/* =========================================================
   Cockpit V0 — Finaforte
   Frontend logic: email-gate, fetch, render
   Spec: Masterplan Landingpage v2/dashboard/specs/2026-05-16-dashboard-v0.md
   ========================================================= */
(function () {
  'use strict';

  var API_ENDPOINT     = '/api/dashboard.php';
  var STORAGE_KEY      = 'ff_dashboard_access';
  var STORAGE_EMAIL_KEY = 'ff_dashboard_email';
  var AUTH_EMAIL_DOMAIN = 'finaforte.nl'; // simpele client-side hint, server is autoritair (V1)

  // ============================================================
  // Email-gate (V0: lichtgewicht, server-side in V1)
  // ============================================================
  function initGate() {
    var gateEl = document.getElementById('ff-gate');
    var appEl  = document.getElementById('ff-app');
    var form   = document.getElementById('ff-gate-form');
    var input  = document.getElementById('ff-gate-email');

    var existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing === 'ok') {
      gateEl.hidden = true;
      appEl.hidden  = false;
      bootDashboard();
      return;
    }

    gateEl.hidden = false;
    appEl.hidden  = true;

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = (input.value || '').trim().toLowerCase();
      if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
        input.focus();
        return;
      }
      // Soft check: emails on finaforte.nl direct toegestaan;
      // andere ook toegestaan maar gemarkeerd (V0 — server gating in V1).
      sessionStorage.setItem(STORAGE_KEY, 'ok');
      sessionStorage.setItem(STORAGE_EMAIL_KEY, email);
      gateEl.hidden = true;
      appEl.hidden  = false;
      bootDashboard();
    });
  }

  // ============================================================
  // Dashboard boot + refresh
  // ============================================================
  function bootDashboard() {
    var refreshBtn = document.getElementById('ff-refresh');
    refreshBtn.addEventListener('click', function () {
      loadData(true);
    });

    // Detail-toggle voor M4
    document.querySelectorAll('.ff-card__detail-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card   = btn.closest('.ff-card');
        var detail = card.querySelector('.ff-card__detail');
        if (!detail) return;
        var open = !detail.hidden;
        detail.hidden = open;
        btn.setAttribute('aria-expanded', String(!open));
        btn.textContent = open ? 'Per mail ▾' : 'Verberg ▴';
      });
    });

    loadData(false);
  }

  function loadData(forceRefresh) {
    var refreshBtn = document.getElementById('ff-refresh');
    refreshBtn.classList.add('ff-refresh--loading');

    var url = API_ENDPOINT + (forceRefresh ? '?refresh=1' : '');

    fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        render(data);
        toast(forceRefresh ? 'Data ververst' : null);
      })
      .catch(function (err) {
        toast('Kon data niet laden: ' + err.message, true);
        console.error('[cockpit]', err);
      })
      .finally(function () {
        refreshBtn.classList.remove('ff-refresh--loading');
      });
  }

  // ============================================================
  // Render
  // ============================================================
  function render(data) {
    var metrics = data.metrics || {};
    var errors  = data.errors  || [];
    var errorBySource = {};
    errors.forEach(function (e) { errorBySource[e.source] = e.message; });

    // Topbar timestamp
    var updatedEl = document.getElementById('ff-updated');
    var age = parseInt(data.cache_age_seconds || 0, 10);
    var gen = data.generated_at ? new Date(data.generated_at) : null;
    if (gen) {
      var ageMin = Math.floor(age / 60);
      var label = ageMin <= 0
        ? 'zojuist bijgewerkt'
        : 'bijgewerkt ' + ageMin + ' min geleden';
      updatedEl.textContent = label;
    } else {
      updatedEl.textContent = '—';
    }

    renderScansWeek(metrics.scans_week, errorBySource['brevo-scans']);
    renderCallsWeek(metrics.calls_week, errorBySource['calendly']);
    renderConversion(metrics.conversion_30d, errorBySource['calendly']);
    renderF4(metrics.f4_engagement_30d, errorBySource['brevo-f4-stats']);
    renderTopCalcs(metrics.top_calcs_30d, errorBySource['brevo-top-calcs']);
    renderRedLamp(metrics.red_lamp, errorBySource['brevo-health']);
    renderMarketingEvents(metrics.marketing_events, errorBySource['first-party-events']);
  }

  // --- Card renderers ---

  function renderScansWeek(m, err) {
    var card = card_('scans_week');
    if (err || !m) return renderError(card, err || 'Geen data');
    bind(card, 'value', m.value);
    bind(card, 'delta', deltaBadge(m.delta_pct));
    bind(card, 'sub', 'Gem. 4w: ' + fmtNum(m.avg_4w));
    setStatus(card, m.status);
  }

  function renderCallsWeek(m, err) {
    var card = card_('calls_week');
    if (err || !m) return renderError(card, err || 'Calendly nog niet gekoppeld');
    bind(card, 'value', m.value);
    bind(card, 'delta', deltaBadge(m.delta_pct));
    bind(card, 'sub', 'Gem. 4w: ' + fmtNum(m.avg_4w));
    setStatus(card, m.status);
  }

  function renderConversion(m, err) {
    var card = card_('conversion_30d');
    if (err || !m) return renderError(card, err || 'Calendly nog niet gekoppeld');
    var v = m.value_pct;
    bind(card, 'value', v === null ? '—' : v.toFixed(1));
    bind(card, 'sub', fmtNum(m.scans_30d) + ' scans · ' + fmtNum(m.calls_30d) + ' calls');
    setStatus(card, m.status);
  }

  function renderF4(m, err) {
    var card = card_('f4_engagement_30d');
    if (err || !m) return renderError(card, err || 'Geen data');
    var avg = m.avg_open_rate_pct;
    bind(card, 'value', avg === null ? '—' : avg.toFixed(1));
    setStatus(card, m.status);

    // Detail per template
    var detail = card.querySelector('[data-bind="detail"]');
    if (detail && Array.isArray(m.per_template)) {
      detail.innerHTML = '';
      if (m.note) {
        var note = document.createElement('li');
        note.className = 'ff-card__detail-note';
        note.textContent = m.note;
        detail.appendChild(note);
      }
      m.per_template.forEach(function (t, i) {
        var li = document.createElement('li');
        var name = document.createElement('span');
        name.textContent = 'Mail ' + (i + 1) + ' · #' + t.id;
        var val = document.createElement('span');
        val.textContent = (t.open_pct === null ? '—' : t.open_pct.toFixed(1)) + '% ('
          + fmtNum(t.sent) + ' verz.)';
        li.appendChild(name);
        li.appendChild(val);
        detail.appendChild(li);
      });
    }
  }

  function renderTopCalcs(list, err) {
    var card = card_('top_calcs_30d');
    if (err) return renderError(card, err);
    var rank = card.querySelector('[data-bind="rank"]');
    if (!rank) return;
    rank.innerHTML = '';
    if (!list || list.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'ff-rank__empty';
      empty.textContent = 'Nog geen calc-leads in deze periode.';
      rank.appendChild(empty);
      return;
    }
    list.forEach(function (item, i) {
      var li = document.createElement('li');

      var num = document.createElement('span');
      num.className = 'ff-rank__num';
      num.textContent = '#' + (i + 1);

      var name = document.createElement('span');
      name.className = 'ff-rank__name';
      name.innerHTML = escapeHtml(item.calc_name)
        + '<small>UTM_CONTENT=' + escapeHtml(item.utm_content) + '</small>';

      var count = document.createElement('span');
      count.className = 'ff-rank__count';
      count.textContent = item.leads + ' lead' + (item.leads === 1 ? '' : 's');

      li.appendChild(num);
      li.appendChild(name);
      li.appendChild(count);
      rank.appendChild(li);
    });
  }

  function renderRedLamp(m, err) {
    var card = card_('red_lamp');
    if (err || !m) return renderError(card, err || 'Geen data');
    var value = card.querySelector('[data-bind="value"]');
    var issuesEl = card.querySelector('[data-bind="issues"]');

    if (m.status === 'green') {
      value.textContent = 'Alles in orde';
      value.classList.remove('ff-card__value--small');
      value.classList.add('ff-card__value--small');
      issuesEl.innerHTML = '';
      issuesEl.classList.add('ff-issues--ok');
    } else {
      value.textContent = (m.issues || []).length + ' issue'
        + ((m.issues || []).length === 1 ? '' : 's');
      issuesEl.innerHTML = '';
      issuesEl.classList.remove('ff-issues--ok');
      (m.issues || []).forEach(function (issue) {
        var li = document.createElement('li');
        li.textContent = issue;
        issuesEl.appendChild(li);
      });
    }
    setStatus(card, m.status);
  }

  function renderMarketingEvents(m, err) {
    if (err || !m) {
      renderInsightEmpty('funnel', err || 'Nog geen meetdata.');
      renderInsightEmpty('sources', err || 'Nog geen meetdata.');
      renderInsightEmpty('blindspots', err || 'Nog geen meetdata.');
      renderInsightEmpty('ctas', err || 'Nog geen meetdata.');
      return;
    }
    renderFunnelList(m.funnel_7d || []);
    renderMiniRank('sources', m.top_sources_30d || [], 'Nog geen brondata.');
    renderMiniRank('blindspots', m.top_blindspots_30d || [], 'Nog geen scan-thema data.');
    renderMiniRank('ctas', m.top_ctas_30d || [], 'Nog geen CTA-clicks.');
  }

  function renderFunnelList(rows) {
    var list = document.querySelector('[data-bind="funnel"]');
    if (!list) return;
    list.innerHTML = '';
    if (!rows.length) {
      renderInsightEmpty('funnel', 'Nog geen funnel-events.');
      return;
    }
    var max = rows.reduce(function (acc, row) {
      return Math.max(acc, parseInt(row.count || 0, 10));
    }, 0);
    rows.forEach(function (row) {
      var li = document.createElement('li');
      var label = document.createElement('span');
      label.textContent = row.label || row.event || 'Stap';
      var value = document.createElement('strong');
      value.textContent = fmtNum(row.count);
      var bar = document.createElement('i');
      bar.style.width = max > 0 ? Math.max(4, Math.round((row.count / max) * 100)) + '%' : '0';
      li.appendChild(label);
      li.appendChild(value);
      li.appendChild(bar);
      list.appendChild(li);
    });
  }

  function renderMiniRank(kind, rows, emptyText) {
    var list = document.querySelector('[data-insight="' + kind + '"] [data-bind]');
    if (!list) return;
    list.innerHTML = '';
    if (!rows.length) {
      renderInsightEmpty(kind, emptyText);
      return;
    }
    rows.forEach(function (row) {
      var li = document.createElement('li');
      var label = document.createElement('span');
      label.textContent = row.label || row.calc_name || row.utm_content || 'Onbekend';
      var count = document.createElement('strong');
      count.textContent = fmtNum(row.count);
      li.appendChild(label);
      li.appendChild(count);
      list.appendChild(li);
    });
  }

  function renderInsightEmpty(kind, message) {
    var list = document.querySelector('[data-insight="' + kind + '"] [data-bind]');
    if (!list) return;
    list.innerHTML = '';
    var li = document.createElement('li');
    li.className = 'ff-mini-rank__empty';
    li.textContent = message;
    list.appendChild(li);
  }

  // ============================================================
  // DOM helpers
  // ============================================================
  function card_(metric) {
    return document.querySelector('.ff-card[data-metric="' + metric + '"]');
  }

  function bind(card, name, value) {
    var el = card.querySelector('[data-bind="' + name + '"]');
    if (!el) return;
    if (value && typeof value === 'object' && value.nodeType === 1) {
      el.innerHTML = '';
      el.appendChild(value);
    } else {
      el.textContent = (value === null || value === undefined) ? '—' : String(value);
    }
  }

  function setStatus(card, status) {
    var bar = card.querySelector('[data-bind="status"]');
    if (!bar) return;
    bar.classList.remove('ff-card__bar--green', 'ff-card__bar--orange',
                         'ff-card__bar--red', 'ff-card__bar--unknown');
    bar.classList.add('ff-card__bar--' + (status || 'unknown'));
  }

  function renderError(card, message) {
    card.classList.add('ff-card--error');
    var val = card.querySelector('[data-bind="value"]');
    if (val) val.textContent = 'n.v.t.';
    var existing = card.querySelector('.ff-card__error-note');
    if (existing) existing.remove();
    var note = document.createElement('div');
    note.className = 'ff-card__error-note';
    note.textContent = message;
    card.appendChild(note);
    setStatus(card, 'unknown');
  }

  function deltaBadge(deltaPct) {
    // Null = geen vergelijking mogelijk (bv. vorige periode had 0).
    // Toon dan helemaal niets — cleaner dan een placeholder-streep.
    if (deltaPct === null || deltaPct === undefined) {
      return document.createTextNode('');
    }
    var span = document.createElement('span');
    if (deltaPct > 0) {
      span.className = 'ff-card__delta ff-card__delta--up';
      span.textContent = '↑ +' + deltaPct + '%';
    } else if (deltaPct < 0) {
      span.className = 'ff-card__delta ff-card__delta--down';
      span.textContent = '↓ ' + deltaPct + '%';
    } else {
      span.className = 'ff-card__delta ff-card__delta--flat';
      span.textContent = '→ 0%';
    }
    return span;
  }

  function fmtNum(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return String(n);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(message, isError) {
    if (!message) return;
    var el = document.getElementById('ff-toast');
    el.textContent = message;
    el.style.background = isError ? '#c0392b' : 'var(--dark-green)';
    el.hidden = false;
    setTimeout(function () { el.hidden = true; }, 2200);
  }

  // ============================================================
  // Init
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGate);
  } else {
    initGate();
  }
})();
