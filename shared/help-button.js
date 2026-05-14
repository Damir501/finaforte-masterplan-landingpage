/* Finaforte floating help button + contact-modal
   ------------------------------------------------
   - Self-injects FAB rechtsonder + modal markup
   - Modal-opties: e-mail, telefoon, LinkedIn (geen Calendly — dat is al de hero-CTA)
   - ESC + click-outside sluiten modal
   - Body-scroll-lock op open
   - data-event hooks voor analytics-cta.js: 'help-fab-open', 'help-mail', 'help-call', 'help-linkedin'
   - Verbergt zichzelf op viewports <900px wanneer mobile-cta-bar de focus heeft
*/
(function () {
  'use strict';

  if (document.querySelector('.help-fab')) return;

  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'help-fab';
  fab.setAttribute('aria-label', 'Stel een vraag');
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('data-event', 'help-fab-open');
  fab.innerHTML = '<span class="help-fab__icon" aria-hidden="true">?</span><span class="help-fab__label">Vraag</span>';

  var modal = document.createElement('div');
  modal.className = 'help-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'help-modal-title');
  modal.setAttribute('hidden', '');
  modal.innerHTML = [
    '<div class="help-modal__backdrop" data-help-close></div>',
    '<div class="help-modal__card" role="document">',
    '  <button type="button" class="help-modal__close" aria-label="Sluiten" data-help-close>&times;</button>',
    '  <p class="help-modal__eyebrow">— STEL EEN VRAAG —</p>',
    '  <h2 id="help-modal-title" class="help-modal__title">Even sparren met <em>Damir</em>?</h2>',
    '  <p class="help-modal__lede">Korte vraag of twijfel? Pak het kanaal dat bij u past — antwoord meestal binnen 1 werkdag.</p>',
    '  <ul class="help-modal__options">',
    '    <li>',
    '      <a class="help-modal__option" href="mailto:info@finaforte.nl?subject=Vraag%20via%20masterplan.finaforte.nl" data-event="help-mail">',
    '        <span class="help-modal__option-label">E-mail</span>',
    '        <span class="help-modal__option-value">info@finaforte.nl</span>',
    '      </a>',
    '    </li>',
    '    <li>',
    '      <a class="help-modal__option" href="tel:+31850074080" data-event="help-call">',
    '        <span class="help-modal__option-label">Telefoon</span>',
    '        <span class="help-modal__option-value">+31 85 007 4080</span>',
    '      </a>',
    '    </li>',
    '    <li>',
    '      <a class="help-modal__option" href="https://www.linkedin.com/in/damirtvrtkovic/" target="_blank" rel="noopener" data-event="help-linkedin">',
    '        <span class="help-modal__option-label">LinkedIn</span>',
    '        <span class="help-modal__option-value">Damir Tvrtkovic — bericht</span>',
    '      </a>',
    '    </li>',
    '  </ul>',
    '  <p class="help-modal__foot">Liever direct een 30-min kennismaking? <a href="https://calendly.com/d/cxqh-9ht-kp7/finaforte-masterplan" target="_blank" rel="noopener" data-event="help-modal-calendly">Plan via Calendly</a>.</p>',
    '</div>'
  ].join('');

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    document.body.appendChild(fab);
    document.body.appendChild(modal);

    function openModal() {
      modal.removeAttribute('hidden');
      document.body.classList.add('help-modal-open');
      fab.setAttribute('aria-expanded', 'true');
      var firstFocusable = modal.querySelector('.help-modal__close');
      if (firstFocusable) firstFocusable.focus();
    }
    function closeModal() {
      modal.setAttribute('hidden', '');
      document.body.classList.remove('help-modal-open');
      fab.setAttribute('aria-expanded', 'false');
      fab.focus();
    }

    fab.addEventListener('click', function () {
      if (modal.hasAttribute('hidden')) openModal();
      else closeModal();
    });

    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-help-close')) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
    });
  });
})();
