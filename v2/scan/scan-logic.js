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
      finish(state);
      return;
    }
    renderProgress(state.currentIdx + 1, qs.length);
    renderQuestion(qs[state.currentIdx], state);
  }

  function finish(state) {
    var stage = $(STAGE_ID);
    if (stage) {
      stage.innerHTML = '<div class="scan-analyzing">' + window.ARCHITECT.scan.analyzing + '</div>';
    }
    var scores = window.ScanScoring.calculateScores(state.answers);
    var top3 = window.ScanScoring.getTop3(scores);
    var hash = window.ScanFingerprint.encode(top3);
    setTimeout(function() {
      location.href = '/v2/rapport/?p=' + hash;
    }, 1400);
  }

  function init() {
    if (!window.SCAN_DATA || !window.ScanState || !window.ScanScoring ||
        !window.ScanFingerprint || !window.ARCHITECT) {
      console.error('scan-logic: missing dependencies');
      return;
    }
    advance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
