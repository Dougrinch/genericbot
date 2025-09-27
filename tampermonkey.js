// ==UserScript==
// @name         Galaxy Click — Nested Iframe Runner
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Run only inside nested iframes that were opened from https://galaxy.click/play/*
// @match        *://*/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Must be inside a frame (nested iframes are fine)
  if (window.top === window.self) return;

  // Only continue if this frame was opened from a galaxy.click/play/* page
  const fromGalaxyPlay =
    (document.referrer && document.referrer.startsWith('https://galaxy.click/play/')) ||
    (location.ancestorOrigins &&
      Array.from(location.ancestorOrigins).some(o => o === 'https://galaxy.click'));

  if (!fromGalaxyPlay) return;

  function init() {
    //BEFORE

    //COPY PASTE dist/bot.iife.js HERE

    //AFTER
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
