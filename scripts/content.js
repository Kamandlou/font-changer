/**
 * Font Changer - Content Script
 * Applies selected font (e.g. Vazirmatn) cleanly to web pages.
 */

(function () {
  const STYLE_ID = '__persian_font_changer_style__';

  const DEFAULT_SETTINGS = {
    enabled: true,
    selectedFont: 'vazirmatn-fd',
    customFont: '',
    fontSizeOffset: 0,
    lineHeight: 'normal',
    disabledSites: []
  };

  // Font definitions mapped to font-family strings
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

  function getFontFamilyRule(settings) {
    if (settings.selectedFont === 'custom' && settings.customFont.trim()) {
      return `'${settings.customFont.trim()}', 'Vazirmatn FD', -apple-system, sans-serif`;
    }
    return FONT_FAMILIES[settings.selectedFont] || FONT_FAMILIES['vazirmatn-fd'];
  }

  function generateCSS(settings) {
    const fontFamily = getFontFamilyRule(settings);
    const fontFaces = getFontFacesCSS();

    let extraRules = '';
    if (settings.lineHeight && settings.lineHeight !== 'normal') {
      extraRules += `line-height: ${settings.lineHeight} !important;`;
    }

    // High specificity rules while strictly exempting code blocks & icons
    return `
      ${fontFaces}

      :root, html, body {
        font-family: ${fontFamily} !important;
      }

      /* Apply font to elements with high specificity */
      html body,
      html body p, html body h1, html body h2, html body h3, html body h4, html body h5, html body h6,
      html body span, html body a, html body li, html body ul, html body ol, html body dl, html body dt, html body dd,
      html body input, html body textarea, html body select, html body button,
      html body label, html body table, html body th, html body td, html body caption,
      html body blockquote, html body q, html body cite, html body b, html body strong, html body small, html body em,
      html body header, html body footer, html body nav, html body section, html body article, html body aside, html body main,
      html body div:not([class*="icon"]):not([class*="fa-"]):not([class*="fa"]):not([class*="material-"]):not([class*="codicon"]) {
        font-family: ${fontFamily} !important;
        ${extraRules}
      }

      /* Protect code blocks, terminals, and monospace text */
      pre, code, kbd, samp, tt,
      pre *, code *, kbd *, samp *,
      .monaco-editor, .ace_editor, .CodeMirror {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
      }

      /* Protect icon fonts, glyphs, and svg icons */
      [class*="icon"], [class*="fa-"], [class*="fa"],
      .fa, .fas, .far, .fal, .fab, .fad,
      .material-icons, [class*="material-symbols"],
      .octicon, .codicon, .bi, .feather,
      [data-icon], svg, svg * {
        font-family: inherit !important;
      }
    `;
  }

  function isSiteDisabled(disabledSites) {
    if (!Array.isArray(disabledSites)) return false;
    const currentHost = window.location.hostname.toLowerCase();
    return disabledSites.some(site => {
      const s = site.toLowerCase().trim();
      return s && (currentHost === s || currentHost.endsWith('.' + s));
    });
  }

  function applySettings(settings) {
    const shouldDisable = !settings.enabled || isSiteDisabled(settings.disabledSites);
    const existingStyle = document.getElementById(STYLE_ID);

    if (shouldDisable) {
      if (existingStyle) {
        existingStyle.remove();
      }
      return;
    }

    const css = generateCSS(settings);
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
  }

  // Load initial settings
  chrome.storage.sync.get(DEFAULT_SETTINGS, function (items) {
    applySettings(items);
  });

  // Listen for storage changes (updates all open tabs automatically)
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'sync') {
      chrome.storage.sync.get(DEFAULT_SETTINGS, function (items) {
        applySettings(items);
      });
    }
  });

  // Listen for direct runtime messages
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'SETTINGS_UPDATED') {
      applySettings(message.settings);
      sendResponse({ status: 'ok' });
    }
  });
})();
