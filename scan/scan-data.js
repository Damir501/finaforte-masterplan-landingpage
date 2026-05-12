/**
 * Finaforte Scan — vragen-data + scoring-matrix.
 * Geladen vóór scan-logic.js. IIFE-pattern, attached to window.SCAN_DATA.
 */
(function() {
  'use strict';

  var CORE_QUESTIONS = [
    {
      id: 'q1',
      label: 'Welke situatie beschrijft u het best?',
      sub: 'Bepaalt welke verdiepende vragen u krijgt.',
      options: [
        { id: 'dga',        label: 'DGA (eigenaar besloten vennootschap)' },
        { id: 'zzp',        label: 'ZZP / eenmanszaak' },
        { id: 'particulier', label: 'Particulier met vermogen' },
        { id: 'combinatie', label: 'Combinatie (bv. DGA met privévermogen)' }
      ]
    },
    {
      id: 'q2',
      label: 'Hoe is uw onderneming gestructureerd?',
      options: [
        { id: 'holding_werk', label: 'Holding + werkmaatschappij' },
        { id: 'een_bv',       label: 'Eén BV' },
        { id: 'geen_bv',      label: 'Geen BV (eenmanszaak / VOF)' },
        { id: 'nvt',          label: 'Niet van toepassing' }
      ]
    },
    {
      id: 'q3',
      label: 'Waar ligt uw vermogen voornamelijk?',
      options: [
        { id: 'bv',       label: 'In de BV' },
        { id: 'prive',    label: 'Privé (box 3)' },
        { id: 'vastgoed', label: 'In vastgoed' },
        { id: 'pensioen', label: 'In pensioenpot / lijfrente' },
        { id: 'verdeeld', label: 'Verdeeld over meerdere posten' }
      ]
    },
    {
      id: 'q4',
      label: 'Wat staat in de komende 5 jaar op de planning?',
      options: [
        { id: 'verkoop',   label: 'Verkoop onderneming' },
        { id: 'overdracht', label: 'Overdracht aan kinderen / opvolger' },
        { id: 'pensioen',  label: 'Pensioen / stoppen' },
        { id: 'groei',     label: 'Groei / uitbreiding' },
        { id: 'niets',     label: 'Niets specifieks' }
      ]
    },
    {
      id: 'q5',
      label: 'Hoe vaak werken uw adviseurs onderling af?',
      sub: 'Boekhouder, fiscalist, hypotheekadviseur, notaris.',
      options: [
        { id: 'structureel', label: 'Structureel (minimaal 1x per jaar)' },
        { id: 'soms',        label: 'Soms — bij grote beslissingen' },
        { id: 'nooit',       label: 'Nooit — ze werken los van elkaar' }
      ]
    },
    {
      id: 'q6',
      label: 'Wanneer keek u voor het laatst integraal naar het geheel?',
      options: [
        { id: 'minder_1jr', label: 'Minder dan 1 jaar geleden' },
        { id: '1_3jr',      label: '1 tot 3 jaar geleden' },
        { id: 'meer_3jr',   label: 'Meer dan 3 jaar geleden' },
        { id: 'nooit',      label: 'Nog nooit' }
      ]
    }
  ];

  var DGA_QUESTIONS = [
    {
      id: 'q7_dga', label: 'Hoe verhoudt zich uw salaris tot het dividend dat u opneemt?',
      options: [
        { id: 'salaris_dominant', label: 'Vooral salaris' },
        { id: 'mix',              label: 'Mix van beide' },
        { id: 'dividend_dominant',label: 'Vooral dividend' },
        { id: 'onbekend',         label: 'Geen idee — fiscalist regelt dat' }
      ]
    },
    {
      id: 'q8_dga', label: 'Heeft u een lening van uw BV?',
      options: [
        { id: 'ja_groot',   label: 'Ja, substantieel (>€100k)' },
        { id: 'ja_klein',   label: 'Ja, beperkt (<€100k)' },
        { id: 'nee',        label: 'Nee' },
        { id: 'onbekend',   label: 'Weet ik niet zeker' }
      ]
    },
    {
      id: 'q9_dga', label: 'Hoe staat het met pensioen in eigen beheer?',
      options: [
        { id: 'afgekocht',  label: 'Afgekocht / omgezet' },
        { id: 'lopend',     label: 'Loopt nog door (ODV / lijfrente)' },
        { id: 'nooit_gehad', label: 'Nooit gehad' },
        { id: 'onbekend',   label: 'Weet ik niet' }
      ]
    },
    {
      id: 'q10_dga', label: 'Vastgoed: zit dat in de BV of in privé?',
      options: [
        { id: 'bv',       label: 'In de BV' },
        { id: 'prive',    label: 'In privé' },
        { id: 'beide',    label: 'Beide' },
        { id: 'geen',     label: 'Geen vastgoed (anders dan eigen woning)' }
      ]
    },
    {
      id: 'q11_dga', label: 'Heeft u een bedrijfsopvolgingsplan op papier?',
      options: [
        { id: 'ja_recent',   label: 'Ja, recent geactualiseerd' },
        { id: 'ja_oud',      label: 'Ja, maar verouderd' },
        { id: 'nee_ooit',    label: 'Nee, wel ooit aan gedacht' },
        { id: 'nee',         label: 'Nee, helemaal niet' }
      ]
    }
  ];

  var PARTICULIER_QUESTIONS = [
    {
      id: 'q7_p', label: 'Hoe groot is uw vermogen in box 3 (vermogen buiten de eigen woning)?',
      options: [
        { id: 'lt_100k',   label: 'Minder dan €100.000' },
        { id: '100_500k',  label: '€100.000 – €500.000' },
        { id: '500k_1m',   label: '€500.000 – €1.000.000' },
        { id: '1m_2m',     label: '€1.000.000 – €2.000.000' },
        { id: 'gt_2m',     label: 'Meer dan €2.000.000' }
      ]
    },
    {
      id: 'q8_p', label: 'Hypotheek + box-1-aftrek — hoe zit dat?',
      options: [
        { id: 'volledig_aflossen', label: 'Volledig aflossen, geen aftrek meer' },
        { id: 'deels_aftrek',      label: 'Deels aftrekbaar' },
        { id: 'volledig_aftrek',   label: 'Volledig aftrekbaar' },
        { id: 'geen_hypotheek',    label: 'Geen hypotheek (meer)' }
      ]
    },
    {
      id: 'q9_p', label: 'Heeft u schenkingen gedaan de afgelopen 5 jaar?',
      options: [
        { id: 'ja_groot',  label: 'Ja, substantieel' },
        { id: 'ja_klein',  label: 'Ja, kleine bedragen' },
        { id: 'nee',       label: 'Nee, nog niet' },
        { id: 'overweeg',  label: 'Overweeg het binnenkort' }
      ]
    },
    {
      id: 'q10_p', label: 'Heeft u een plan voor hoe het vermogen wordt doorgegeven?',
      options: [
        { id: 'ja_uitgewerkt', label: 'Ja, helemaal uitgewerkt' },
        { id: 'ja_globaal',    label: 'Globaal — testament aanwezig' },
        { id: 'denken',        label: 'Erover nadenken, nog niets vastgelegd' },
        { id: 'nee',           label: 'Nee, niet bezig' }
      ]
    },
    {
      id: 'q11_p', label: 'Bouwt u aanvullend pensioen op via lijfrente of beleggen?',
      options: [
        { id: 'structureel', label: 'Structureel — maandelijks / jaarlijks' },
        { id: 'incidenteel', label: 'Incidenteel' },
        { id: 'nee',         label: 'Nee' },
        { id: 'onbekend',    label: 'Weet ik niet zeker' }
      ]
    }
  ];

  var ZZP_QUESTIONS = [
    {
      id: 'q7_z', label: 'Wat is uw omzet-tendens de afgelopen 3 jaar?',
      options: [
        { id: 'groei',     label: 'Sterke groei' },
        { id: 'stabiel',   label: 'Stabiel' },
        { id: 'krimp',     label: 'Krimp' },
        { id: 'wisselend', label: 'Wisselend' }
      ]
    },
    {
      id: 'q8_z', label: 'Heeft u een oudedagsvoorziening (FOR, lijfrente, beleggen)?',
      options: [
        { id: 'meerdere', label: 'Ja, meerdere pijlers' },
        { id: 'een',      label: 'Ja, één pijler' },
        { id: 'for',      label: 'Alleen FOR' },
        { id: 'geen',     label: 'Geen' }
      ]
    },
    {
      id: 'q9_z', label: 'Is een BV een actueel overweging?',
      options: [
        { id: 'binnenkort', label: 'Ja, binnenkort' },
        { id: 'overwogen',  label: 'Ooit overwogen, niet nu' },
        { id: 'nooit',      label: 'Nooit overwogen' },
        { id: 'al_bv',      label: 'Heb al een BV gehad' }
      ]
    },
    {
      id: 'q10_z', label: 'Hoe verhoudt zich uw vermogen privé tot zakelijk?',
      options: [
        { id: 'gemixed',   label: 'Loopt door elkaar' },
        { id: 'gescheiden', label: 'Helder gescheiden' },
        { id: 'voornamelijk_prive', label: 'Voornamelijk privé' },
        { id: 'voornamelijk_zakelijk', label: 'Voornamelijk zakelijk' }
      ]
    },
    {
      id: 'q11_z', label: 'Plant u uw pensioen structureel?',
      options: [
        { id: 'jaarlijks', label: 'Jaarlijks check' },
        { id: 'soms',      label: 'Soms' },
        { id: 'nooit',     label: 'Nooit' }
      ]
    }
  ];

  /**
   * Scoring-matrix: [questionId][answerId] → array van {domain, weight}
   * Punten worden opgeteld; daarna 1.2× bias-multiplier op β-domeinen.
   */
  var SCORING = {
    q1: {
      dga:         [{ domain: 'salaris_dividend', weight: 2 }, { domain: 'lenen_bv', weight: 1 }],
      zzp:         [{ domain: 'peb_odv_lijfrente', weight: 2 }, { domain: 'pensioengat', weight: 1 }],
      particulier: [{ domain: 'box3_optimizer', weight: 2 }, { domain: 'estate', weight: 1 }],
      combinatie:  [{ domain: 'estate', weight: 2 }, { domain: 'box3_optimizer', weight: 1 }, { domain: 'salaris_dividend', weight: 1 }]
    },
    q2: {
      holding_werk: [{ domain: 'estate', weight: 2 }, { domain: 'salaris_dividend', weight: 1 }],
      een_bv:       [{ domain: 'salaris_dividend', weight: 2 }, { domain: 'lenen_bv', weight: 1 }],
      geen_bv:      [{ domain: 'peb_odv_lijfrente', weight: 2 }],
      nvt:          []
    },
    q3: {
      bv:       [{ domain: 'lenen_bv', weight: 2 }, { domain: 'salaris_dividend', weight: 1 }],
      prive:    [{ domain: 'box3_2028', weight: 2 }, { domain: 'box3_optimizer', weight: 1 }],
      vastgoed: [{ domain: 'vastgoed', weight: 3 }, { domain: 'eigen_woning', weight: 1 }],
      pensioen: [{ domain: 'pensioengat', weight: 2 }, { domain: 'peb_odv_lijfrente', weight: 2 }],
      verdeeld: [{ domain: 'box3_2028', weight: 1 }, { domain: 'peildatum', weight: 1 }]
    },
    q4: {
      verkoop:    [{ domain: 'estate', weight: 3 }, { domain: 'schenken_erven', weight: 2 }],
      overdracht: [{ domain: 'schenken_erven', weight: 3 }, { domain: 'estate', weight: 2 }],
      pensioen:   [{ domain: 'pensioengat', weight: 3 }, { domain: 'peb_odv_lijfrente', weight: 2 }],
      groei:      [{ domain: 'salaris_dividend', weight: 1 }, { domain: 'aflossen_beleggen', weight: 1 }],
      niets:      []
    },
    q5: {
      structureel: [],
      soms:        [{ domain: 'estate', weight: 1 }],
      nooit:       [{ domain: 'estate', weight: 2 }, { domain: 'pensioengat', weight: 1 }, { domain: 'box3_2028', weight: 1 }]
    },
    q6: {
      minder_1jr: [],
      '1_3jr':    [{ domain: 'box3_2028', weight: 1 }],
      meer_3jr:   [{ domain: 'box3_2028', weight: 2 }, { domain: 'estate', weight: 1 }, { domain: 'pensioengat', weight: 1 }],
      nooit:      [{ domain: 'box3_2028', weight: 3 }, { domain: 'estate', weight: 2 }, { domain: 'pensioengat', weight: 2 }]
    },
    q7_dga: {
      salaris_dominant:  [{ domain: 'salaris_dividend', weight: 2 }],
      mix:               [{ domain: 'salaris_dividend', weight: 1 }],
      dividend_dominant: [{ domain: 'salaris_dividend', weight: 3 }, { domain: 'box3_2028', weight: 1 }],
      onbekend:          [{ domain: 'salaris_dividend', weight: 3 }]
    },
    q8_dga: {
      ja_groot:  [{ domain: 'lenen_bv', weight: 3 }],
      ja_klein:  [{ domain: 'lenen_bv', weight: 2 }],
      nee:       [],
      onbekend:  [{ domain: 'lenen_bv', weight: 2 }]
    },
    q9_dga: {
      afgekocht:   [{ domain: 'pensioengat', weight: 2 }],
      lopend:      [{ domain: 'peb_odv_lijfrente', weight: 2 }],
      nooit_gehad: [{ domain: 'pensioengat', weight: 3 }],
      onbekend:    [{ domain: 'pensioengat', weight: 2 }, { domain: 'peb_odv_lijfrente', weight: 1 }]
    },
    q10_dga: {
      bv:    [{ domain: 'vastgoed', weight: 2 }, { domain: 'lenen_bv', weight: 1 }],
      prive: [{ domain: 'vastgoed', weight: 2 }, { domain: 'box3_2028', weight: 1 }],
      beide: [{ domain: 'vastgoed', weight: 3 }],
      geen:  []
    },
    q11_dga: {
      ja_recent: [],
      ja_oud:    [{ domain: 'estate', weight: 2 }, { domain: 'schenken_erven', weight: 1 }],
      nee_ooit:  [{ domain: 'estate', weight: 3 }, { domain: 'schenken_erven', weight: 2 }],
      nee:       [{ domain: 'estate', weight: 3 }, { domain: 'schenken_erven', weight: 2 }, { domain: 'pensioengat', weight: 1 }]
    },
    q7_p: {
      lt_100k:  [],
      '100_500k': [{ domain: 'box3_2028', weight: 1 }, { domain: 'box3_optimizer', weight: 1 }],
      '500k_1m':  [{ domain: 'box3_2028', weight: 2 }, { domain: 'box3_optimizer', weight: 1 }],
      '1m_2m':    [{ domain: 'box3_2028', weight: 3 }, { domain: 'box3_optimizer', weight: 2 }],
      gt_2m:      [{ domain: 'box3_2028', weight: 3 }, { domain: 'box3_optimizer', weight: 3 }, { domain: 'estate', weight: 1 }]
    },
    q8_p: {
      volledig_aflossen: [{ domain: 'aflossen_beleggen', weight: 2 }, { domain: 'eigen_woning', weight: 1 }],
      deels_aftrek:      [{ domain: 'aflossen_beleggen', weight: 1 }],
      volledig_aftrek:   [{ domain: 'eigen_woning', weight: 2 }, { domain: 'aflossen_beleggen', weight: 1 }],
      geen_hypotheek:    [{ domain: 'box3_2028', weight: 1 }]
    },
    q9_p: {
      ja_groot:  [{ domain: 'schenken_erven', weight: 2 }, { domain: 'estate', weight: 1 }],
      ja_klein:  [{ domain: 'schenken_erven', weight: 1 }],
      nee:       [{ domain: 'schenken_erven', weight: 2 }, { domain: 'estate', weight: 1 }],
      overweeg:  [{ domain: 'schenken_erven', weight: 3 }, { domain: 'estate', weight: 2 }]
    },
    q10_p: {
      ja_uitgewerkt: [],
      ja_globaal:    [{ domain: 'estate', weight: 1 }, { domain: 'schenken_erven', weight: 1 }],
      denken:        [{ domain: 'estate', weight: 2 }, { domain: 'schenken_erven', weight: 2 }],
      nee:           [{ domain: 'estate', weight: 3 }, { domain: 'schenken_erven', weight: 2 }]
    },
    q11_p: {
      structureel: [],
      incidenteel: [{ domain: 'pensioengat', weight: 1 }],
      nee:         [{ domain: 'pensioengat', weight: 2 }, { domain: 'peb_odv_lijfrente', weight: 1 }],
      onbekend:    [{ domain: 'pensioengat', weight: 2 }]
    },
    q7_z: {
      groei:     [{ domain: 'salaris_dividend', weight: 1 }, { domain: 'aflossen_beleggen', weight: 1 }],
      stabiel:   [],
      krimp:     [{ domain: 'pensioengat', weight: 1 }],
      wisselend: [{ domain: 'peb_odv_lijfrente', weight: 1 }, { domain: 'pensioengat', weight: 1 }]
    },
    q8_z: {
      meerdere: [],
      een:      [{ domain: 'pensioengat', weight: 1 }, { domain: 'peb_odv_lijfrente', weight: 1 }],
      for:      [{ domain: 'pensioengat', weight: 2 }, { domain: 'peb_odv_lijfrente', weight: 2 }],
      geen:     [{ domain: 'pensioengat', weight: 3 }, { domain: 'peb_odv_lijfrente', weight: 2 }]
    },
    q9_z: {
      binnenkort: [{ domain: 'salaris_dividend', weight: 2 }, { domain: 'lenen_bv', weight: 1 }],
      overwogen:  [{ domain: 'salaris_dividend', weight: 1 }],
      nooit:      [],
      al_bv:      [{ domain: 'salaris_dividend', weight: 1 }]
    },
    q10_z: {
      gemixed:                  [{ domain: 'box3_optimizer', weight: 2 }, { domain: 'box3_2028', weight: 1 }],
      gescheiden:               [],
      voornamelijk_prive:       [{ domain: 'box3_2028', weight: 1 }],
      voornamelijk_zakelijk:    [{ domain: 'aflossen_beleggen', weight: 1 }]
    },
    q11_z: {
      jaarlijks: [],
      soms:      [{ domain: 'pensioengat', weight: 1 }],
      nooit:     [{ domain: 'pensioengat', weight: 2 }]
    }
  };

  var BETA_BIAS = {
    pensioengat:    1.2,
    estate:         1.2,
    schenken_erven: 1.2,
    box3_2028:      1.2
  };

  function getQuestionSet(profile) {
    var deep;
    if (profile === 'dga' || profile === 'combinatie') deep = DGA_QUESTIONS;
    else if (profile === 'particulier') deep = PARTICULIER_QUESTIONS;
    else if (profile === 'zzp') deep = ZZP_QUESTIONS;
    else deep = DGA_QUESTIONS;
    return CORE_QUESTIONS.concat(deep);
  }

  window.SCAN_DATA = {
    CORE_QUESTIONS: CORE_QUESTIONS,
    DGA_QUESTIONS: DGA_QUESTIONS,
    PARTICULIER_QUESTIONS: PARTICULIER_QUESTIONS,
    ZZP_QUESTIONS: ZZP_QUESTIONS,
    SCORING: SCORING,
    BETA_BIAS: BETA_BIAS,
    getQuestionSet: getQuestionSet
  };
})();
