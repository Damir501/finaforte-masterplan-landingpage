/**
 * Scan-state: sessionStorage persistence voor antwoorden + huidige stap.
 * Verlies bij refresh wordt voorkomen.
 */
(function() {
  'use strict';

  var KEY = 'finaforte_scan_v2';

  function emptyState() {
    return { answers: {}, currentIdx: 0, profile: null, startedAt: Date.now() };
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.answers !== 'object') return emptyState();
      return parsed;
    } catch (e) {
      return emptyState();
    }
  }

  function save(state) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function clear() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
  }

  function setAnswer(state, questionId, answerId) {
    state.answers[questionId] = answerId;
    if (questionId === 'q1') state.profile = answerId;
    save(state);
    return state;
  }

  window.ScanState = {
    load: load, save: save, clear: clear,
    setAnswer: setAnswer, emptyState: emptyState, KEY: KEY
  };
})();
