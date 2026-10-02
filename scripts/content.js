/**
 * Font Changer - Content Script
 * Opt-in / Whitelist mode: Only applies font to user-specified websites.
 */

(function () {
  const STYLE_ID = '__persian_font_changer_style__';

  const DEFAULT_SETTINGS = {
    enabled: true,
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
      extraRules += `line-height: ${lineHeight} !important;`;
    }

    return `
      ${fontFaces}

      :root, html, body {
        font-family: ${fontFamily} !important;
      }

      /* Apply font to general elements */
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

  function getSiteConfig(enabledSites) {
    if (!enabledSites || typeof enabledSites !== 'object') return null;
    const currentHost = window.location.hostname.toLowerCase();
    if (!currentHost) return null;

    // Object format: { "hostname": { font, lineHeight, customFont } }
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

    // If NOT enabled for this site, guarantee NO font style is applied
    if (!siteConfig) {
      if (existingStyle) {
        existingStyle.remove();
      }
      return;
    }

    // Site IS enabled -> inject or update custom font CSS
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

  // Direct message listener
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'SETTINGS_UPDATED') {
      applySettings(message.settings);
      sendResponse({ status: 'ok' });
    }
  });
})();
