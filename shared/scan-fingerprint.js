/**
 * Finaforte Scan Fingerprint
 * Codeert/decodeert top-3 domein-IDs in een URL-safe hash.
 * Gebruikt door scan-logic.js (encode → rapport-redirect) en rapport.js (decode).
 */
(function() {
  'use strict';

  function encode(domainIds) {
    if (!Array.isArray(domainIds) || domainIds.length === 0) return '';
    var json = JSON.stringify(domainIds);
    var b64 = btoa(json);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(hash) {
    if (typeof hash !== 'string' || !hash) return null;
    try {
      var padded = hash.replace(/-/g, '+').replace(/_/g, '/');
      var pad = (4 - padded.length % 4) % 4;
      padded = padded + new Array(pad + 1).join('=');
      var json = atob(padded);
      var parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  window.ScanFingerprint = { encode: encode, decode: decode };
})();
