/**
 * Scan-logic: rendering, flow-control, branching.
 * Vereist scan-data.js, scan-state.js, scan-scoring.js, architect-copy.js,
 * scan-fingerprint.js in deze volgorde geladen vóór dit script.
 */
(function() {
  'use strict';

  var STAGE_ID = 'scan-stage';
  var PROGRESS_ID = 'scan-progress';
  var PROGRESS_FILL_ID = 'scan-progress-fill';

  function $(id) { return document.getElementById(id); }

  function track(name, props) {
    try {
      if (window.FinaforteTrack) window.FinaforteTrack(name, props || {});
    } catch (e) {}
  }

  function trackOnce(key, name, props) {
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (e) {}
    track(name, props);
  }

  function getQuestions(state) {
    if (!state.profile) return window.SCAN_DATA.CORE_QUESTIONS;
    return window.SCAN_DATA.getQuestionSet(state.profile);
  }

  function renderProgress(curr, total) {
    var p = $(PROGRESS_ID);
    var f = $(PROGRESS_FILL_ID);
    if (p) p.textContent = window.ARCHITECT.scan.progress(curr, total);
    if (f) f.style.width = (curr / total * 100) + '%';
  }

  function renderQuestion(question, state) {
    var stage = $(STAGE_ID);
    if (!stage) return;
    stage.innerHTML = '';

    var h = document.createElement('h2');
    h.className = 'scan-q-label';
    h.textContent = question.label;
    stage.appendChild(h);

    if (question.sub) {
      var sub = document.createElement('p');
      sub.className = 'scan-q-sub';
      sub.textContent = question.sub;
      stage.appendChild(sub);
    }

    var ul = document.createElement('ul');
    ul.className = 'scan-q-options';
    question.options.forEach(function(opt) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scan-q-option';
      btn.textContent = opt.label;
      btn.setAttribute('data-answer', opt.id);
      if (state.answers[question.id] === opt.id) {
        btn.classList.add('selected');
      }
      btn.addEventListener('click', function() {
        onAnswer(question, opt);
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    stage.appendChild(ul);

    if (state.currentIdx > 0) {
      var nav = document.createElement('div');
      nav.className = 'scan-q-nav';
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'scan-q-back';
      back.textContent = '← Vorige vraag';
      back.addEventListener('click', goBack);
      nav.appendChild(back);
      stage.appendChild(nav);
    }
  }

  function onAnswer(question, opt) {
    var state = window.ScanState.load();
    window.ScanState.setAnswer(state, question.id, opt.id);
    track('scan_step_answered', {
      question_id: question.id,
      answer_id: opt.id,
      step: state.currentIdx + 1,
      profile: state.profile || null
    });
    state.currentIdx = state.currentIdx + 1;
    window.ScanState.save(state);
    advance();
  }

  function goBack() {
    var state = window.ScanState.load();
    if (state.currentIdx === 0) return;
    state.currentIdx = state.currentIdx - 1;
    window.ScanState.save(state);
    advance();
  }

  function advance() {
    var state = window.ScanState.load();
    var qs = getQuestions(state);
    if (state.currentIdx >= qs.length) {
      renderEmailForm(state, qs.length);
      return;
    }
    renderProgress(state.currentIdx + 1, qs.length);
    renderQuestion(qs[state.currentIdx], state);
  }

  function renderEmailForm(state, totalQuestions) {
    var stage = $(STAGE_ID);
    if (!stage) return;
    trackOnce('ff_track_scan_email_step', 'scan_email_step_reached', {
      questions: totalQuestions,
      profile: state.profile || null
    });
    var p = $(PROGRESS_ID);
    var f = $(PROGRESS_FILL_ID);
    if (p) p.textContent = 'Laatste stap — uw gegevens';
    if (f) f.style.width = '100%';

    var copy = window.ARCHITECT.scan.email_form;
    stage.innerHTML = '';

    var h = document.createElement('h2');
    h.className = 'scan-form-title';
    h.textContent = copy.title;
    stage.appendChild(h);

    var body = document.createElement('p');
    body.className = 'scan-form-body';
    body.textContent = copy.body;
    stage.appendChild(body);

    var form = document.createElement('form');
    form.className = 'scan-form-fields';
    form.setAttribute('novalidate', '');
    form.setAttribute('autocomplete', 'on');

    var row = document.createElement('div');
    row.className = 'scan-form-row';
    row.appendChild(buildField('firstName', copy.first_name_label, 'text', 'given-name', state));
    row.appendChild(buildField('lastName',  copy.last_name_label,  'text', 'family-name', state));
    form.appendChild(row);
    form.appendChild(buildField('email', copy.email_label, 'email', 'email', state));

    var consentWrap = document.createElement('label');
    consentWrap.className = 'scan-form-consent';
    var consentBox = document.createElement('input');
    consentBox.type = 'checkbox';
    consentBox.name = 'consent';
    consentBox.id = 'scan-consent';
    if (state.consent) consentBox.checked = true;
    var consentText = document.createElement('span');
    consentText.textContent = copy.consent_label;
    consentWrap.appendChild(consentBox);
    consentWrap.appendChild(consentText);
    form.appendChild(consentWrap);

    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'scan-form-submit';
    submit.textContent = copy.submit_label;
    form.appendChild(submit);

    var errorBox = document.createElement('div');
    errorBox.className = 'scan-form-error';
    errorBox.setAttribute('role', 'alert');
    errorBox.id = 'scan-form-error';
    form.appendChild(errorBox);

    var privacy = document.createElement('p');
    privacy.className = 'scan-form-privacy';
    privacy.textContent = copy.privacy_note;
    form.appendChild(privacy);

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      onFormSubmit(form, submit, errorBox, copy);
    });
    stage.appendChild(form);

    if (state.currentIdx > 0) {
      var nav = document.createElement('div');
      nav.className = 'scan-q-nav';
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'scan-q-back';
      back.textContent = '← Vorige vraag';
      back.addEventListener('click', goBack);
      nav.appendChild(back);
      stage.appendChild(nav);
    }

    var firstInput = form.querySelector('input[name="firstName"]');
    if (firstInput && !firstInput.value) firstInput.focus();
  }

  function buildField(name, label, type, autocomplete, state) {
    var wrap = document.createElement('div');
    wrap.className = 'scan-form-field';
    var lab = document.createElement('label');
    lab.setAttribute('for', 'scan-' + name);
    lab.textContent = label;
    var input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.id = 'scan-' + name;
    input.className = 'scan-form-input';
    input.setAttribute('autocomplete', autocomplete);
    if (state.contact && state.contact[name]) input.value = state.contact[name];
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return wrap;
  }

  function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');
  }

  function onFormSubmit(form, submitBtn, errorBox, copy) {
    var data = {
      firstName: (form.elements.firstName.value || '').trim(),
      lastName:  (form.elements.lastName.value  || '').trim(),
      email:     (form.elements.email.value     || '').trim(),
      consent:   form.elements.consent.checked
    };

    var problems = [];
    if (!data.firstName) problems.push('voornaam');
    if (!data.lastName)  problems.push('achternaam');
    if (!isValidEmail(data.email)) problems.push('e-mailadres');
    if (!data.consent)   problems.push('akkoord');

    [['firstName', form.elements.firstName],
     ['lastName',  form.elements.lastName],
     ['email',     form.elements.email]].forEach(function(pair) {
      var key = pair[0], el = pair[1];
      var bad = (key === 'email') ? !isValidEmail(data.email) : !data[key];
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    });

    if (problems.length) {
      errorBox.textContent = 'Vul nog in: ' + problems.join(', ') + '.';
      return;
    }
    errorBox.textContent = '';

    submitBtn.disabled = true;
    submitBtn.textContent = copy.submitting_label;

    var state = window.ScanState.load();
    state.contact = { firstName: data.firstName, lastName: data.lastName, email: data.email };
    state.consent = true;
    window.ScanState.save(state);

    window.ScanSubmit.submit(data, state).then(function(result) {
      showAnalyzingAndRedirect(result.hash);
    }).catch(function() {
      var hash = '';
      try {
        var scores = window.ScanScoring.calculateScores(state.answers);
        hash = window.ScanFingerprint.encode(window.ScanScoring.getTop3(scores));
      } catch (e) {}
      showAnalyzingAndRedirect(hash);
    });
  }

  function showAnalyzingAndRedirect(hash) {
    var stage = $(STAGE_ID);
    if (stage) {
      stage.innerHTML = '<div class="scan-analyzing">' + window.ARCHITECT.scan.analyzing + '</div>';
    }
    setTimeout(function() {
      location.href = '/rapport/?p=' + (hash || '');
    }, 1200);
  }

  function init() {
    if (!window.SCAN_DATA || !window.ScanState || !window.ScanScoring ||
        !window.ScanFingerprint || !window.ARCHITECT || !window.ScanSubmit) {
      console.error('scan-logic: missing dependencies');
      return;
    }
    var state = window.ScanState.load();
    trackOnce('ff_track_scan_started', 'scan_started', {
      profile: state.profile || null,
      current_idx: state.currentIdx || 0
    });
    advance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
