/**
 * Font Changer - Popup Script
 * Pure Site-by-Site Whitelist Mode.
 */

const DEFAULT_SETTINGS = {
  enabledSites: {} // { "domain.com": { font: "vazirmatn-fd", customFont: "", lineHeight: "normal" } }
};

const FONT_MAP = {
  'vazirmatn-fd': `'Vazirmatn FD', 'Vazirmatn', sans-serif`,
  'vazirmatn': `'Vazirmatn', 'Vazirmatn FD', sans-serif`,
  'sahel': `'Sahel', 'Vazirmatn FD', sans-serif`,
  'shabnam': `'Shabnam', 'Vazirmatn FD', sans-serif`,
  'tahoma': `Tahoma, Arial, sans-serif`
};

const FONT_LABELS = {
  'vazirmatn-fd': 'وزیرمتن فارسی',
  'vazirmatn': 'وزیرمتن لاتین',
  'sahel': 'ساحل',
  'shabnam': 'شبنم',
  'tahoma': 'تاهما',
  'custom': 'دلخواه'
};

let enabledSites = {};
let currentHostname = '';

// DOM Elements
const siteCard = document.getElementById('site-card');
const siteHost = document.getElementById('site-host');
const siteToggle = document.getElementById('site-toggle');
const siteStatusHint = document.getElementById('site-status-hint');
const mainSettings = document.getElementById('main-settings');
const fontSelect = document.getElementById('font-select');
const customFontGroup = document.getElementById('custom-font-group');
const customFontInput = document.getElementById('custom-font-input');
const lineHeightBtns = document.querySelectorAll('.segment-btn');
const previewText = document.getElementById('preview-text');
const sitesListCount = document.getElementById('sites-list-count');
const sitesUl = document.getElementById('sites-ul');
const sitesEmpty = document.getElementById('sites-empty');
const toggleSitesList = document.getElementById('toggle-sites-list');
const sitesListContent = document.getElementById('sites-list-content');
const sitesChevron = document.getElementById('sites-chevron');
const resetBtn = document.getElementById('reset-btn');

async function init() {
  // 1. Identify current active tab domain
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        if (url.protocol.startsWith('http')) {
          currentHostname = url.hostname.toLowerCase();
          siteHost.textContent = currentHostname;
        } else {
          siteCard.style.display = 'none';
        }
      } catch (e) {
        siteCard.style.display = 'none';
      }
    } else {
      siteCard.style.display = 'none';
    }
  } catch (e) {
    siteCard.style.display = 'none';
  }

  // 2. Load enabledSites from storage
  chrome.storage.sync.get(['enabledSites'], (items) => {
    let sites = items.enabledSites;
    if (!sites || typeof sites !== 'object') {
      enabledSites = {};
    } else if (Array.isArray(sites)) {
      enabledSites = {};
      sites.forEach(d => {
        if (d) enabledSites[d.toLowerCase()] = { font: 'vazirmatn-fd', lineHeight: 'normal' };
      });
    } else {
      enabledSites = { ...sites };
    }

    renderUI();
  });

  // 3. Register Event Listeners
  bindEvents();
}

function getSelectedLineHeight() {
  const activeBtn = document.querySelector('.segment-btn.active');
  return activeBtn ? activeBtn.dataset.value : 'normal';
}

function setSelectedLineHeight(val) {
  lineHeightBtns.forEach((btn) => {
    if (btn.dataset.value === (val || 'normal')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function renderUI() {
  const isSiteActive = !!(currentHostname && enabledSites[currentHostname]);
  siteToggle.checked = isSiteActive;

  if (isSiteActive) {
    const config = enabledSites[currentHostname] || {};
    fontSelect.value = config.font || 'vazirmatn-fd';
    customFontInput.value = config.customFont || '';
    setSelectedLineHeight(config.lineHeight || 'normal');

    siteCard.classList.add('active-site');
    const label = FONT_LABELS[config.font] || config.customFont || 'وزیرمتن';
    siteStatusHint.textContent = `فونت این سایت به «${label}» تغییر یافته است`;
    siteStatusHint.classList.add('active');
  } else {
    siteCard.classList.remove('active-site');
    siteStatusHint.textContent = 'فونت این سایت تغییر نمی‌کند (پیش‌فرض)';
    siteStatusHint.classList.remove('active');
  }

  // Custom font field
  customFontGroup.style.display = fontSelect.value === 'custom' ? 'block' : 'none';

  updatePreview();
  renderSitesList();
}

function updatePreview() {
  const selectedFont = fontSelect.value;
  let font = FONT_MAP[selectedFont] || FONT_MAP['vazirmatn-fd'];
  if (selectedFont === 'custom' && customFontInput.value.trim()) {
    font = `'${customFontInput.value.trim()}', sans-serif`;
  }
  const lh = getSelectedLineHeight();
  previewText.style.fontFamily = font;
  previewText.style.lineHeight = lh === 'normal' ? '1.6' : lh;
}

function renderSitesList() {
  const domains = Object.keys(enabledSites);
  sitesListCount.textContent = `سایت‌های فعال شده (${domains.length})`;

  sitesUl.innerHTML = '';
  if (domains.length === 0) {
    sitesEmpty.style.display = 'block';
    sitesUl.style.display = 'none';
  } else {
    sitesEmpty.style.display = 'none';
    sitesUl.style.display = 'flex';

    domains.forEach(domain => {
      const config = enabledSites[domain] || {};
      const fontLabel = FONT_LABELS[config.font] || config.customFont || 'وزیرمتن';

      const li = document.createElement('li');
      li.className = 'site-item';
      li.innerHTML = `
        <div class="site-item-info">
          <span class="site-item-domain" title="${domain}">${domain}</span>
          <span class="site-item-font">${fontLabel}</span>
        </div>
        <button type="button" class="site-delete-btn" data-domain="${domain}" title="حذف از سایت‌های فعال">✕</button>
      `;
      sitesUl.appendChild(li);
    });

    // Delete buttons
    sitesUl.querySelectorAll('.site-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domainToDelete = e.currentTarget.dataset.domain;
        delete enabledSites[domainToDelete];

        if (domainToDelete === currentHostname) {
          siteToggle.checked = false;
          siteCard.classList.remove('active-site');
          siteStatusHint.textContent = 'فونت این سایت تغییر نمی‌کند (پیش‌فرض)';
          siteStatusHint.classList.remove('active');
        }

        saveAndNotify();
        renderSitesList();
      });
    });
  }
}

function saveAndNotify() {
  chrome.storage.sync.set({ enabledSites: enabledSites }, () => {
    updatePreview();
    // Notify active tab content script
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) return;
        if (tabs && tabs.length > 0 && tabs[0].id) {
          try {
            const p = chrome.tabs.sendMessage(tabs[0].id, {
              type: 'SETTINGS_UPDATED',
              settings: { enabledSites: enabledSites }
            }, () => {
              if (chrome.runtime.lastError) { /* ignore */ }
            });
            if (p && typeof p.catch === 'function') {
              p.catch(() => {});
            }
          } catch (e) {
            // Ignore restricted tabs
          }
        }
      });
    } catch (e) {
      // Ignore
    }
  });
}

function bindEvents() {
  // Site Toggle (Hero Switch)
  siteToggle.addEventListener('change', () => {
    if (!currentHostname) return;

    if (siteToggle.checked) {
      // Enable font for this site
      enabledSites[currentHostname] = {
        font: fontSelect.value,
        customFont: customFontInput.value.trim(),
        lineHeight: getSelectedLineHeight()
      };
      siteCard.classList.add('active-site');
      const label = FONT_LABELS[fontSelect.value] || 'وزیرمتن';
      siteStatusHint.textContent = `فونت این سایت به «${label}» تغییر یافته است`;
      siteStatusHint.classList.add('active');
    } else {
      // Disable font for this site
      delete enabledSites[currentHostname];
      siteCard.classList.remove('active-site');
      siteStatusHint.textContent = 'فونت این سایت تغییر نمی‌کند (پیش‌فرض)';
      siteStatusHint.classList.remove('active');
    }

    saveAndNotify();
    renderSitesList();
  });

  // Font Selection
  fontSelect.addEventListener('change', () => {
    const isCustom = fontSelect.value === 'custom';
    customFontGroup.style.display = isCustom ? 'block' : 'none';
    if (isCustom) customFontInput.focus();

    // If site is currently active, update its config and live notify
    if (siteToggle.checked && currentHostname) {
      enabledSites[currentHostname].font = fontSelect.value;
      const label = FONT_LABELS[fontSelect.value] || 'وزیرمتن';
      siteStatusHint.textContent = `فونت این سایت به «${label}» تغییر یافته است`;
      renderSitesList();
      saveAndNotify();
    } else {
      updatePreview();
    }
  });

  // Custom Font Input
  let customFontDebounce;
  customFontInput.addEventListener('input', () => {
    clearTimeout(customFontDebounce);
    customFontDebounce = setTimeout(() => {
      if (siteToggle.checked && currentHostname) {
        enabledSites[currentHostname].customFont = customFontInput.value.trim();
        renderSitesList();
        saveAndNotify();
      } else {
        updatePreview();
      }
    }, 300);
  });

  // Line Height Buttons
  lineHeightBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      lineHeightBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      if (siteToggle.checked && currentHostname) {
        enabledSites[currentHostname].lineHeight = btn.dataset.value;
        saveAndNotify();
      } else {
        updatePreview();
      }
    });
  });

  // Accordion Toggle
  toggleSitesList.addEventListener('click', () => {
    const isHidden = sitesListContent.style.display === 'none';
    sitesListContent.style.display = isHidden ? 'block' : 'none';
    sitesChevron.classList.toggle('collapsed', !isHidden);
  });

  // Reset Button
  resetBtn.addEventListener('click', () => {
    if (confirm('آیا از پاک کردن تمامی سایت‌های فعال اطمینان دارید؟ فونت همه سایت‌ها به حالت عادی برمی‌گردد.')) {
      enabledSites = {};
      renderUI();
      saveAndNotify();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
