/**
 * Font Changer - Popup Script
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  selectedFont: 'vazirmatn-fd',
  customFont: '',
  fontSizeOffset: 0,
  lineHeight: 'normal',
  disabledSites: []
};

const FONT_MAP = {
  'vazirmatn-fd': `'Vazirmatn FD', 'Vazirmatn', sans-serif`,
  'vazirmatn': `'Vazirmatn', 'Vazirmatn FD', sans-serif`,
  'sahel': `'Sahel', 'Vazirmatn FD', sans-serif`,
  'shabnam': `'Shabnam', 'Vazirmatn FD', sans-serif`,
  'tahoma': `Tahoma, Arial, sans-serif`
};

let currentSettings = { ...DEFAULT_SETTINGS };
let currentHostname = '';

// DOM Elements
const globalToggle = document.getElementById('global-toggle');
const siteCard = document.getElementById('site-card');
const siteHost = document.getElementById('site-host');
const siteToggle = document.getElementById('site-toggle');
const mainSettings = document.getElementById('main-settings');
const fontSelect = document.getElementById('font-select');
const customFontGroup = document.getElementById('custom-font-group');
const customFontInput = document.getElementById('custom-font-input');
const lineHeightBtns = document.querySelectorAll('.segment-btn');
const previewText = document.getElementById('preview-text');
const resetBtn = document.getElementById('reset-btn');

async function init() {
  // 1. Get current active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        // Only http/https supported
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

  // 2. Load settings from storage
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    currentSettings = { ...DEFAULT_SETTINGS, ...items };
    renderUI();
  });

  // 3. Register Event Listeners
  bindEvents();
}

function renderUI() {
  // Global toggle
  globalToggle.checked = currentSettings.enabled;
  updateGlobalState(currentSettings.enabled);

  // Site toggle
  if (currentHostname) {
    const isSiteDisabled = currentSettings.disabledSites.some(
      (s) => s.toLowerCase() === currentHostname || currentHostname.endsWith('.' + s.toLowerCase())
    );
    siteToggle.checked = !isSiteDisabled;
  }

  // Font select
  fontSelect.value = currentSettings.selectedFont || 'vazirmatn-fd';
  if (fontSelect.value === 'custom') {
    customFontGroup.style.display = 'block';
  } else {
    customFontGroup.style.display = 'none';
  }
  customFontInput.value = currentSettings.customFont || '';

  // Line height
  lineHeightBtns.forEach((btn) => {
    if (btn.dataset.value === currentSettings.lineHeight) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updatePreview();
}

function updateGlobalState(isEnabled) {
  if (isEnabled) {
    mainSettings.classList.remove('disabled-overlay');
    siteCard.classList.remove('disabled-overlay');
  } else {
    mainSettings.classList.add('disabled-overlay');
    siteCard.classList.add('disabled-overlay');
  }
}

function updatePreview() {
  let font = FONT_MAP[currentSettings.selectedFont] || FONT_MAP['vazirmatn-fd'];
  if (currentSettings.selectedFont === 'custom' && currentSettings.customFont.trim()) {
    font = `'${currentSettings.customFont.trim()}', sans-serif`;
  }
  previewText.style.fontFamily = font;
  previewText.style.lineHeight = currentSettings.lineHeight === 'normal' ? '1.6' : currentSettings.lineHeight;
}

function saveAndNotify() {
  chrome.storage.sync.set(currentSettings, () => {
    updatePreview();
    // Notify active tab content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SETTINGS_UPDATED',
          settings: currentSettings
        }).catch(() => {
          // Ignore error on chrome:// or restricted pages
        });
      }
    });
  });
}

function bindEvents() {
  // Global Switch
  globalToggle.addEventListener('change', () => {
    currentSettings.enabled = globalToggle.checked;
    updateGlobalState(currentSettings.enabled);
    saveAndNotify();
  });

  // Current Site Switch
  siteToggle.addEventListener('change', () => {
    if (!currentHostname) return;
    const isEnabledForSite = siteToggle.checked;
    const list = new Set(currentSettings.disabledSites || []);

    if (isEnabledForSite) {
      list.delete(currentHostname);
    } else {
      list.add(currentHostname);
    }

    currentSettings.disabledSites = Array.from(list);
    saveAndNotify();
  });

  // Font Selection
  fontSelect.addEventListener('change', () => {
    currentSettings.selectedFont = fontSelect.value;
    if (fontSelect.value === 'custom') {
      customFontGroup.style.display = 'block';
      customFontInput.focus();
    } else {
      customFontGroup.style.display = 'none';
    }
    saveAndNotify();
  });

  // Custom Font Input
  let customFontDebounce;
  customFontInput.addEventListener('input', () => {
    clearTimeout(customFontDebounce);
    customFontDebounce = setTimeout(() => {
      currentSettings.customFont = customFontInput.value.trim();
      saveAndNotify();
    }, 300);
  });

  // Line Height Buttons
  lineHeightBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      lineHeightBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings.lineHeight = btn.dataset.value;
      saveAndNotify();
    });
  });

  // Reset to default
  resetBtn.addEventListener('click', () => {
    currentSettings = { ...DEFAULT_SETTINGS, disabledSites: [] };
    renderUI();
    saveAndNotify();
  });
}

document.addEventListener('DOMContentLoaded', init);
