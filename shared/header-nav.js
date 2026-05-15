/* Finaforte sticky header + mobile hamburger menu
   ------------------------------------------------
   - Sticky-shadow op .lp-header na 20px scroll (class .lp-header--scrolled)
   - Hamburger toggle opent/sluit mobile cream-paper panel
   - Body-scroll-lock via body.menu-open
   - ESC-key sluit panel
   - Click-outside sluit panel
   - Desktop dropdown via :hover (CSS-only), .lp-header__trigger toggle als click-fallback
*/
(function () {
  'use strict';

  var header = document.querySelector('.lp-header');
  if (!header) return;

  var hamburger = header.querySelector('.lp-header__hamburger');
  var panel = header.querySelector('.lp-header__panel');
  var triggers = header.querySelectorAll('.lp-header__trigger');
  var body = document.body;

  // BUGFIX 2026-05-15: .lp-header heeft backdrop-filter, wat een nieuwe
  // containing block creëert voor position:fixed descendants. Daardoor
  // werd .lp-header__panel beperkt tot de header-hoogte (~68px) i.p.v.
  // viewport-full. Fix: detach panel uit header, plak aan body — dan
  // werkt position:fixed normaal (relatief aan viewport).
  if (panel && panel.parentElement !== body) {
    body.appendChild(panel);
  }

  // Sticky-shadow op scroll
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      header.classList.toggle('lp-header--scrolled', window.scrollY > 20);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger toggle
  function openMenu() {
    if (!panel || !hamburger) return;
    panel.classList.add('lp-header__panel--open');
    body.classList.add('menu-open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Menu sluiten');
  }
  function closeMenu() {
    if (!panel || !hamburger) return;
    panel.classList.remove('lp-header__panel--open');
    body.classList.remove('menu-open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Menu openen');
  }
  if (hamburger && panel) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.classList.contains('lp-header__panel--open')) closeMenu();
      else openMenu();
    });
    // Sluit panel als gebruiker op een link in panel tapt
    panel.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMenu();
    });
  }

  // ESC sluit panel
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel && panel.classList.contains('lp-header__panel--open')) closeMenu();
  });

  // Click-outside sluit panel
  document.addEventListener('click', function (e) {
    if (!panel || !panel.classList.contains('lp-header__panel--open')) return;
    if (panel.contains(e.target) || (hamburger && hamburger.contains(e.target))) return;
    closeMenu();
  });

  // Desktop dropdown click-toggle (hover werkt via CSS — dit is click-fallback voor touch/keyboard)
  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var group = trigger.closest('.lp-header__group');
      var wasOpen = group.classList.contains('lp-header__group--open');
      // Sluit alle andere groepen
      header.querySelectorAll('.lp-header__group--open').forEach(function (g) {
        g.classList.remove('lp-header__group--open');
        var t = g.querySelector('.lp-header__trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        group.classList.add('lp-header__group--open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
  // Sluit open desktop-dropdowns bij click-outside
  document.addEventListener('click', function (e) {
    var openGroups = header.querySelectorAll('.lp-header__group--open');
    if (!openGroups.length) return;
    if (e.target.closest('.lp-header__group')) return;
    openGroups.forEach(function (g) {
      g.classList.remove('lp-header__group--open');
      var t = g.querySelector('.lp-header__trigger');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  });
})();
