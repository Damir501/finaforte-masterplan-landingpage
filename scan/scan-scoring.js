/**
 * Scoring: berekent domeinscores op basis van antwoorden, past β-bias toe,
 * en geeft top-3 domeinen terug (afgekapt op gelijke score met deterministische
 * tiebreaker = volgorde in DOMAIN_ORDER).
 */
(function() {
  'use strict';

  var DOMAIN_ORDER = [
    'pensioengat', 'estate', 'schenken_erven', 'box3_2028',
    'salaris_dividend', 'eigen_woning', 'box3_optimizer', 'lenen_bv',
    'pensioen_toeslagen', 'peildatum', 'vastgoed', 'peb_odv_lijfrente',
    'aflossen_beleggen'
  ];

  function calculateScores(answers) {
    if (!window.SCAN_DATA) throw new Error('SCAN_DATA niet geladen');
    var scoring = window.SCAN_DATA.SCORING;
    var bias = window.SCAN_DATA.BETA_BIAS;

    var scores = {};
    DOMAIN_ORDER.forEach(function(d) { scores[d] = 0; });

    Object.keys(answers).forEach(function(qId) {
      var aId = answers[qId];
      if (!scoring[qId] || !scoring[qId][aId]) return;
      scoring[qId][aId].forEach(function(entry) {
        if (typeof scores[entry.domain] === 'number') {
          scores[entry.domain] += entry.weight;
        }
      });
    });

    Object.keys(bias).forEach(function(d) {
      if (typeof scores[d] === 'number') {
        scores[d] = scores[d] * bias[d];
      }
    });

    return scores;
  }

  function getTop3(scores) {
    var entries = DOMAIN_ORDER.map(function(d, idx) {
      return { domain: d, score: scores[d] || 0, order: idx };
    });
    entries.sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    });
    var top = entries.slice(0, 3).map(function(e) { return e.domain; });

    if (top.indexOf('estate') !== -1 && top.indexOf('schenken_erven') !== -1) {
      var allOver = entries.filter(function(e) {
        return e.domain !== 'estate' && e.domain !== 'schenken_erven';
      });
      var first = allOver[0];
      if (first && first.score > 0) {
        top = ['estate', 'schenken_erven', first.domain];
      }
    }

    return top;
  }

  window.ScanScoring = {
    DOMAIN_ORDER: DOMAIN_ORDER,
    calculateScores: calculateScores,
    getTop3: getTop3
  };
})();
