// ==UserScript==
// @name         Galaxy Click — Nested Iframe Runner
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Run only inside nested iframes that were opened from https://galaxy.click/play/*
// @match        *://*/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @connect      dougrinch.com
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

  function loadBotScript() {
    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://dougrinch.com/genericbot/bot.iife.js',
      onload: function(response) {
        if (response.status === 200) {
          try {
            new Function(response.responseText)();
          } catch (error) {
            alert('Failed to execute bot script: ' + error);
          }
        } else {
          alert('Failed to load bot script. Status: ' + response.status);
        }
      },
      onerror: function(error) {
        alert('Network error loading bot script: ' + error);
      }
    });
  }

  function init() {
    loadBotScript();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
