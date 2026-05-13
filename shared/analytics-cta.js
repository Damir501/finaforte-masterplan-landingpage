(function () {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (!el) return;
    var name = el.getAttribute('data-event');
    if (!name) return;
    if (typeof window.goatcounter !== 'undefined' &&
        typeof window.goatcounter.count === 'function') {
      window.goatcounter.count({ path: 'event-' + name, title: name, event: true });
    }
  }, true);
})();
