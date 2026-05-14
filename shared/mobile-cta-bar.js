/* Finaforte sticky mobile bottom-bar — "Plan kennismaking"
   ----------------------------------------------------------
   - Self-injects sticky CTA-bar onderaan, alleen bij viewport <900px.
   - Verschijnt pas na 240px scroll (anders concurreert het met hero-CTA).
   - Toggle body.has-mobile-cta-bar zodat help-fab.css 80px boven kan blijven.
   - Sluit-knop (×) verbergt bar voor sessie (sessionStorage).
   - Skip op /scan/ (de funnel heeft eigen progress-bar onderaan en de
     Calendly-CTA zou de scan-flow verstoren).
*/
(function () {
  'use strict';

  if (document.querySelector('.mobile-cta-bar')) return;

  // Skip op scan-pagina (eigen funnel-progress in beeld)
  if (document.body.classList.contains('scan-body')) return;

  var STORAGE_KEY = 'ff-mobile-cta-dismissed';
  try {
    if (window.sessionStorage && sessionStorage.getItem(STORAGE_KEY) === '1') return;
  } catch (e) { /* sessionStorage unavailable — proceed */ }

  var mq = window.matchMedia('(max-width: 899px)');

  var bar = document.createElement('div');
  bar.className = 'mobile-cta-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Snelle kennismaking');
  bar.innerHTML = [
    '<a class="mobile-cta-bar__cta" href="https://calendly.com/d/cxqh-9ht-kp7/finaforte-masterplan" target="_blank" rel="noopener" data-event="mobile-bar-calendly">',
    '  <span class="mobile-cta-bar__label">Plan kennismaking</span>',
    '  <span class="mobile-cta-bar__sub">30 min · gratis · vrijblijvend</span>',
    '</a>',
    '<button type="button" class="mobile-cta-bar__close" aria-label="Verberg deze balk" data-event="mobile-bar-dismiss">&times;</button>'
  ].join('');

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function show() {
    if (!bar.parentNode) document.body.appendChild(bar);
    requestAnimationFrame(function () {
      bar.classList.add('mobile-cta-bar--visible');
      document.body.classList.add('has-mobile-cta-bar');
    });
  }
  function hide() {
    bar.classList.remove('mobile-cta-bar--visible');
    document.body.classList.remove('has-mobile-cta-bar');
  }

  var scrollArmed = false;
  function onScroll() {
    if (scrollArmed) return;
    if (window.scrollY < 240) return;
    scrollArmed = true;
    show();
    window.removeEventListener('scroll', onScroll);
  }

  ready(function () {
    if (!mq.matches) return; // alleen <900px

    window.addEventListener('scroll', onScroll, { passive: true });
    // Als pagina al gescrolld is bij load (refresh midden in pagina)
    onScroll();

    bar.addEventListener('click', function (e) {
      var closeBtn = e.target.closest('.mobile-cta-bar__close');
      if (!closeBtn) return;
      hide();
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (err) { /* ignore */ }
    });

    // Bij resize naar desktop: bar weghalen
    mq.addEventListener('change', function (ev) {
      if (!ev.matches) hide();
      else if (window.scrollY >= 240) show();
    });
  });
})();
