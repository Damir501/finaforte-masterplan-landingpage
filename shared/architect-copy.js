/**
 * Finaforte Architect Copy
 * Centrale single-source-of-truth voor alle architect-frame copy.
 * Laad via <script src="/shared/architect-copy.js"></script> vóór andere v2-scripts.
 */
(function() {
  'use strict';

  var ARCHITECT = {
    hero: {
      h1: 'Het bouwplan voor je vermogen — start met de blindspot-scan',
      sub: 'Vermogensplanning voor wie wil weten wat hij niet weet.',
      cta_primary: 'Start de gratis scan',
      cta_secondary: 'Plan gratis kennismaking',
      tag: 'Finaforte · Financieel Architect'
    },
    scan: {
      intro: 'Een architect tekent niet zonder eerst rond te lopen.',
      progress: function(n, total) { return 'Vraag ' + n + ' van ' + total; },
      analyzing: 'Bezig met analyseren...',
      stop_label: 'Stop met scan',
      email_form: {
        title: 'Uw rapport ligt klaar',
        body: 'Vul uw gegevens in. Het rapport komt binnen 60 seconden in uw inbox, en u ziet de samenvatting direct hierna.',
        first_name_label: 'Voornaam',
        last_name_label: 'Achternaam',
        email_label: 'E-mailadres',
        consent_label: 'Ik ga akkoord dat Finaforte mijn gegevens gebruikt voor het rapport en eventuele opvolgmail.',
        submit_label: 'Stuur mijn rapport',
        submitting_label: 'Verzenden...',
        privacy_note: 'Geen nieuwsbrief-spam. Uitschrijven kan altijd met één klik.',
        error: 'Er ging iets mis. Probeer het zo nog eens — of mail info@finaforte.nl.'
      }
    },
    rapport: {
      opener: 'Op basis van uw antwoorden zien wij 3 aandachtspunten die een financieel architect direct zou opmerken.',
      cta_primary: 'Plan uw intake op de bouwplaats — 30 min met Damir',
      cta_secondary: 'Stuur dit rapport naar mijn inbox + Architecten-Academie'
    },
    domeinen: {
      pensioengat: {
        id: 'pensioengat',
        title: 'Het fundament onder uw oude dag heeft scheuren',
        uitleg: '[OQ5: 40-60 woorden — pensioengat-uitleg, architect-frame. Placeholder tot Damir aanlevert.]',
        calculator_path: '/Mini-Calculators/11_Pensioengat/',
        calculator_label: 'Open de Pensioengat-calculator'
      },
      estate: {
        id: 'estate',
        title: 'Het gebouw weet niet hoe het doorgegeven wordt',
        uitleg: '[OQ5: 40-60 woorden — estate planning, architect-frame. Placeholder tot Damir aanlevert.]',
        calculator_path: '/Mini-Calculators/06_Estate_Planning/',
        calculator_label: 'Open de Estate Planning-calculator'
      },
      schenken_erven: {
        id: 'schenken_erven',
        title: 'Wie krijgt welk deel — en wanneer?',
        uitleg: '[OQ5: 40-60 woorden — schenken vs erven, architect-frame. Placeholder.]',
        calculator_path: '/Mini-Calculators/12_Schenken_vs_Erven/',
        calculator_label: 'Open de Schenken-vs-Erven-calculator'
      },
      box3_2028: {
        id: 'box3_2028',
        title: 'Een wetswijziging die uw bouwplan raakt',
        uitleg: '[OQ5: 40-60 woorden — Box 3 2028, architect-frame. Placeholder.]',
        calculator_path: '/Mini-Calculators/13_Box3_2028_Impact/',
        calculator_label: 'Open de Box-3-2028-calculator'
      },
      salaris_dividend: {
        id: 'salaris_dividend',
        title: 'De verhouding salaris/dividend zit niet goed',
        uitleg: '[OQ5: 40-60 woorden — salaris vs dividend. Placeholder.]',
        calculator_path: '/Mini-Calculators/01_Salaris_vs_Dividend/',
        calculator_label: 'Open de Salaris-vs-Dividend-calculator'
      },
      eigen_woning: {
        id: 'eigen_woning',
        title: 'De hefboom in uw eigen woning is onbenut',
        uitleg: '[OQ5: 40-60 woorden — eigen woning hefboom. Placeholder.]',
        calculator_path: '/Mini-Calculators/02_Eigen_Woning_Hefboom/',
        calculator_label: 'Open de Eigen-Woning-Hefboom-calculator'
      },
      box3_optimizer: {
        id: 'box3_optimizer',
        title: 'Uw box-3-vermogen kan compacter staan',
        uitleg: '[OQ5: 40-60 woorden — box 3 optimizer. Placeholder.]',
        calculator_path: '/Mini-Calculators/03_Box3_Optimizer/',
        calculator_label: 'Open de Box-3-Optimizer'
      },
      lenen_bv: {
        id: 'lenen_bv',
        title: 'De lening uit uw BV is een tikkende klok',
        uitleg: '[OQ5: 40-60 woorden — lenen van BV. Placeholder.]',
        calculator_path: '/Mini-Calculators/04_Lenen_van_BV/',
        calculator_label: 'Open de Lenen-van-BV-calculator'
      },
      pensioen_toeslagen: {
        id: 'pensioen_toeslagen',
        title: 'De toeslagen op uw oudedagsplan vragen om herijking',
        uitleg: '[OQ5: 40-60 woorden — pensioen toeslagen. Placeholder.]',
        calculator_path: '/Mini-Calculators/05_Pensioen_Toeslagen/',
        calculator_label: 'Open de Pensioen-Toeslagen-calculator'
      },
      peildatum: {
        id: 'peildatum',
        title: 'De peildatum bepaalt meer dan u denkt',
        uitleg: '[OQ5: 40-60 woorden — peildatum timing. Placeholder.]',
        calculator_path: '/Mini-Calculators/07_Peildatum_Timing/',
        calculator_label: 'Open de Peildatum-Timing-calculator'
      },
      vastgoed: {
        id: 'vastgoed',
        title: 'Vastgoed in BV of privé — het verschil tikt',
        uitleg: '[OQ5: 40-60 woorden — vastgoed scenario. Placeholder.]',
        calculator_path: '/Mini-Calculators/08_Vastgoed_Scenario/',
        calculator_label: 'Open de Vastgoed-Scenario-calculator'
      },
      peb_odv_lijfrente: {
        id: 'peb_odv_lijfrente',
        title: 'Pensioen in eigen beheer vraagt om een tweede blik',
        uitleg: '[OQ5: 40-60 woorden — PEB / ODV / lijfrente. Placeholder.]',
        calculator_path: '/Mini-Calculators/09_PEB_ODV_Lijfrente/',
        calculator_label: 'Open de PEB-ODV-Lijfrente-calculator'
      },
      aflossen_beleggen: {
        id: 'aflossen_beleggen',
        title: 'Aflossen of beleggen — het hangt van uw plan af',
        uitleg: '[OQ5: 40-60 woorden — aflossen vs beleggen. Placeholder.]',
        calculator_path: '/Mini-Calculators/10_Aflossen_vs_Beleggen/',
        calculator_label: 'Open de Aflossen-vs-Beleggen-calculator'
      }
    }
  };

  window.ARCHITECT = ARCHITECT;
})();
