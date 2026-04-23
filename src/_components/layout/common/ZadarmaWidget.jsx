'use client';
import { useEffect, useRef } from 'react';

export default function ZadarmaWidget({ keyId, login }) {
  const initialized = useRef(false);

  // Inject script
  function injectScript(src) {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.zadarma = 'true';
    document.body.appendChild(s);
    return s;
  }

  // Cleanup all widget artifacts
  function cleanupZadarma() {
    console.log('[ZADARMA] FULL CLEANUP');

    // Remove scripts
    document.querySelectorAll('script[data-zadarma], script[src*="zadarma"], script[src*="widget"]').forEach(el => el.remove());

    // Remove CSS
    document.querySelectorAll('link[href*="zadarma"], link[href*="widget"]').forEach(el => el.remove());

    // Remove widget DOM
    document.querySelectorAll('div[id^="zdrm"], .zdrm-webphone, .zdrm-fixed').forEach(el => el.remove());
    document.querySelectorAll('video[id^="zdrm"], audio[id^="zdrm"]').forEach(el => el.remove());

    // Reset globals so scripts can redefine them
    window.ZadarmaPhoneWidget = null;
    window.zadarmaWidgetFn = undefined;

    initialized.current = false;
  }

  // Modify widget UI & force dialpad open
  function modifyUI() {
    const widget = document.querySelector('div[id^="zdrm"]');
    if (!widget) return false;

    console.log('[ZADARMA] Applying custom UI...');

    // POSITION (example: bottom-right)
    widget.style.top = 'auto';
    widget.style.bottom = '20px';
    widget.style.left = 'auto';
    widget.style.right = '20px';

    // SIZE (optional)
    widget.style.width = '360px';
    widget.style.height = '400px';

    // Z-INDEX (raise above everything)
    widget.style.zIndex = '999999';

    // Make widget visible
    widget.style.visibility = 'visible';
    widget.style.opacity = '1';

    return true;
  }

  useEffect(() => {
    if (!keyId || !login) return;
    if (initialized.current) return;

    initialized.current = true;
    console.log('[ZADARMA] Initializing...');

    cleanupZadarma();

    injectScript('https://my.zadarma.com/webphoneWebRTCWidget/v8/js/loader-phone-lib.js?v=23');
    injectScript('https://my.zadarma.com/webphoneWebRTCWidget/v8/js/loader-phone-fn.js?v=23');

    function init() {
      if (typeof window.zadarmaWidgetFn === 'function') {
        console.log('[ZADARMA] Widget ready → calling init');

        window.zadarmaWidgetFn(
          keyId,
          login,
          'square',
          'en',
          true,
          "{right:'10px', bottom:'100px'}"
        );

        // Try styling and opening dialpad until DOM appears
        const uiInterval = setInterval(() => {
          modifyUI();
          clearInterval(uiInterval);
        }, 200);
      } else {
        setTimeout(init, 200);
      }
    }

    init();

    return () => cleanupZadarma();
  }, [keyId, login]);

  return null;
}
