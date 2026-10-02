/**
 * Font Changer - Content Script
 * Robust Whitelist Mode with Complete Icon Protection for Google Gemini, Docs, etc.
 */

(function () {
  const STYLE_ID = '__persian_font_changer_style__';
  let observer = null;

  const DEFAULT_SETTINGS = {
    enabledSites: {} // { "domain.com": { font: "vazirmatn-fd", customFont: "", lineHeight: "normal" } }
  };

  const FONT_FAMILIES = {
    'vazirmatn-fd': `'Vazirmatn FD', 'Vazirmatn', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, sans-serif`,
    'vazirmatn': `'Vazirmatn', 'Vazirmatn FD', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, sans-serif`,
    'sahel': `'Sahel', 'Vazirmatn FD', 'Vazirmatn', sans-serif`,
    'shabnam': `'Shabnam', 'Vazirmatn FD', 'Vazirmatn', sans-serif`,
    'tahoma': `Tahoma, Arial, sans-serif`
  };

  function getFontFacesCSS() {
    const fdReg = chrome.runtime.getURL('fonts/Vazirmatn-FD-Regular.woff2');
    const fdMed = chrome.runtime.getURL('fonts/Vazirmatn-FD-Medium.woff2');
    const fdBold = chrome.runtime.getURL('fonts/Vazirmatn-FD-Bold.woff2');
    const arVar = chrome.runtime.getURL('fonts/vazirmatn-arabic.woff2');
    const lat = chrome.runtime.getURL('fonts/vazirmatn-latin.woff2');

    return `
      @font-face {
        font-family: 'Vazirmatn FD';
        src: url('${fdReg}') format('woff2');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: 'Vazirmatn FD';
        src: url('${fdMed}') format('woff2');
        font-weight: 500;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: 'Vazirmatn FD';
        src: url('${fdBold}') format('woff2');
        font-weight: 700;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: 'Vazirmatn';
        src: url('${arVar}') format('woff2');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: 'Vazirmatn';
        src: url('${lat}') format('woff2');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
    `;
  }

  function getFontFamilyRule(fontKey, customFont) {
    if (fontKey === 'custom' && customFont && customFont.trim()) {
      return `'${customFont.trim()}', 'Vazirmatn FD', -apple-system, sans-serif`;
    }
    return FONT_FAMILIES[fontKey] || FONT_FAMILIES['vazirmatn-fd'];
  }

  function generateCSS(siteConfig) {
    const fontKey = siteConfig.font || 'vazirmatn-fd';
    const customFont = siteConfig.customFont || '';
    const lineHeight = siteConfig.lineHeight || 'normal';

    const fontFamily = getFontFamilyRule(fontKey, customFont);
    const fontFaces = getFontFacesCSS();

    let extraRules = '';
    if (lineHeight && lineHeight !== 'normal') {
      extraRules = `line-height: ${lineHeight} !important;`;
    }

    return `
      ${fontFaces}

      /* 1. Default cascade font for page (without !important on body so class-based icons win) */
      :root, html, body {
        font-family: ${fontFamily};
      }

      /* 2. Text elements with !important for full override */
      p, h1, h2, h3, h4, h5, h6,
      li, ul, ol, dl, dt, dd,
      input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),
      textarea, select,
      label, table, th, td, caption,
      blockquote, q, cite, b, strong, small, em,
      article, section, main {
        font-family: ${fontFamily} !important;
        ${extraRules}
      }

      /* 3. Selective span & a override (strictly exempting icon elements) */
      span:not([class*="symbol"]):not([class*="icon"]):not([class*="Icon"]):not([class*="fa-"]):not(.fa):not(.notranslate):not([aria-hidden="true"]):not([data-icon]),
      a:not([class*="symbol"]):not([class*="icon"]):not([class*="Icon"]):not([class*="fa-"]):not(.fa):not(.notranslate):not([aria-hidden="true"]) {
        font-family: ${fontFamily} !important;
      }

      /* 4. Restore and protect Google Symbols & Material Icons (Gemini, Google Docs, etc.) */
      mat-icon, mat-icon *,
      google-symbols, google-symbols *,
      gm-icon, gm-icon *,
      .google-symbols, .google-symbols *,
      .material-symbols-outlined, .material-symbols-outlined *,
      .material-symbols-rounded, .material-symbols-rounded *,
      .material-symbols-sharp, .material-symbols-sharp *,
      .material-icons, .material-icons *,
      [class*="google-symbols"], [class*="google-symbols"] *,
      [class*="material-symbols"], [class*="material-symbols"] *,
      [class*="material-icons"], [class*="material-icons"] *,
      [class*="mat-icon"], [class*="mat-icon"] *,
      .notranslate[class*="symbol"],
      .notranslate[class*="icon"],
      [data-font-changer-exempt],
      [data-font-changer-exempt] * {
        font-family: 'Google Symbols', 'Material Symbols Outlined', 'Material Symbols Rounded', 'Material Symbols Sharp', 'Material Icons' !important;
        letter-spacing: normal !important;
        white-space: nowrap !important;
        word-wrap: normal !important;
        direction: ltr !important;
        -webkit-font-smoothing: antialiased !important;
        text-rendering: optimizeLegibility !important;
      }

      /* 5. Protect FontAwesome icon fonts */
      .fa, .fas, .far, .fal, .fab, .fad,
      [class*="fa-"], [class*="fa-"] * {
        font-family: "Font Awesome 6 Free", "Font Awesome 5 Free", "FontAwesome" !important;
      }

      /* 6. Protect developer code blocks, terminals, and monospace text */
      pre, code, kbd, samp, tt,
      pre *, code *, kbd *, samp *,
      .monaco-editor, .monaco-editor *,
      .ace_editor, .ace_editor *,
      .CodeMirror, .CodeMirror * {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
      }

      /* 7. Protect SVGs and generic icon fonts */
      [data-icon], svg, svg *,
      .octicon, .octicon *,
      .codicon, .codicon *,
      .bi, .feather {
        font-family: inherit !important;
      }
    `;
  }

  // Dynamic icon protector for apps like Google Gemini
  function protectPageIcons(root = document) {
    if (!root || !root.querySelectorAll) return;

    const iconSelector = [
      'mat-icon',
      'google-symbols',
      'gm-icon',
      '.google-symbols',
      '.material-symbols-outlined',
      '.material-symbols-rounded',
      '.material-symbols-sharp',
      '.material-icons',
      '[class*="google-symbols"]',
      '[class*="material-symbols"]',
      '[class*="material-icons"]',
      '[class*="mat-icon"]',
      'span.notranslate[aria-hidden="true"]',
      '[data-icon]'
    ].join(',');

    try {
      const icons = root.querySelectorAll(iconSelector);
      for (let i = 0; i < icons.length; i++) {
        const el = icons[i];
        el.setAttribute('data-font-changer-exempt', 'true');
        el.style.setProperty('font-family', "'Google Symbols', 'Material Symbols Outlined', 'Material Icons', inherit", 'important');
      }
    } catch (e) {
      // Ignore
    }
  }

  function startIconObserver() {
    if (observer) observer.disconnect();

    protectPageIcons(document);

    observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) { // Element node
              protectPageIcons(node);
            }
          }
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function stopIconObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    // Remove custom attributes & styles
    const exempts = document.querySelectorAll('[data-font-changer-exempt]');
    exempts.forEach(el => {
      el.removeAttribute('data-font-changer-exempt');
      el.style.removeProperty('font-family');
    });
  }

  function getSiteConfig(enabledSites) {
    if (!enabledSites || typeof enabledSites !== 'object') return null;
    const currentHost = window.location.hostname.toLowerCase();
    if (!currentHost) return null;

    // Check direct match or subdomain match
    for (const domain of Object.keys(enabledSites)) {
      const d = domain.toLowerCase().trim();
      if (!d) continue;
      if (currentHost === d || currentHost.endsWith('.' + d)) {
        return enabledSites[domain] || { font: 'vazirmatn-fd', lineHeight: 'normal' };
      }
    }

    return null;
  }

  function applySettings(settings) {
    const existingStyle = document.getElementById(STYLE_ID);
    const siteConfig = getSiteConfig(settings ? settings.enabledSites : null);

    // If NOT enabled for this site, clean up and exit
    if (!siteConfig) {
      if (existingStyle) {
        existingStyle.remove();
      }
      stopIconObserver();
      return;
    }

    // Site IS enabled -> inject CSS & start icon protection
    const css = generateCSS(siteConfig);
    let style = existingStyle;

    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.type = 'text/css';
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(style);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (!document.getElementById(STYLE_ID)) {
            (document.head || document.documentElement).appendChild(style);
          }
        }, { once: true });
      }
    }

    style.textContent = css;

    // Start live protector for Google Symbols and dynamic UI
    if (document.body) {
      startIconObserver();
    } else {
      document.addEventListener('DOMContentLoaded', startIconObserver, { once: true });
    }
  }

  // Initial load
  chrome.storage.sync.get(DEFAULT_SETTINGS, function (items) {
    applySettings(items);
  });

  // Storage listener for live multi-tab sync
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'sync') {
      chrome.storage.sync.get(DEFAULT_SETTINGS, function (items) {
        applySettings(items);
      });
    }
  });

  // Direct message listener from popup
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'SETTINGS_UPDATED') {
      applySettings(message.settings);
      sendResponse({ status: 'ok' });
    }
  });
})();
