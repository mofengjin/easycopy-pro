/**
 * EasyCopy PRO: Popup Controller (Global Edition)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const toggleEnabled = document.getElementById('toggleEnabled');
  const toggleRemoveTail = document.getElementById('toggleRemoveTail');
  const toggleForcePaste = document.getElementById('toggleForcePaste');
  const toggleFloatingPill = document.getElementById('toggleFloatingPill');
  const toggleDeblur = document.getElementById('toggleDeblur');

  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  const licenseBanner = document.getElementById('licenseBanner');
  const licenseTier = document.getElementById('licenseTier');
  const licenseDesc = document.getElementById('licenseDesc');
  const btnUpgrade = document.getElementById('btnUpgrade');

  const btnExtractArticle = document.getElementById('btnExtractArticle');

  // Modal Elements
  const licenseModal = document.getElementById('licenseModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const inputLicenseKey = document.getElementById('inputLicenseKey');
  const btnSubmitLicense = document.getElementById('btnSubmitLicense');
  const licenseModalStatus = document.getElementById('licenseModalStatus');

  let currentSettings = {
    enabled: true,
    removeCopyrightTail: true,
    forcePaste: true,
    showFloatingPill: true,
    deblurStudySites: true,
    isProUser: false,
    licenseKey: ''
  };

  // 1. Load Stored Settings
  chrome.storage.sync.get(currentSettings, (items) => {
    currentSettings = { ...currentSettings, ...items };
    applySettingsToUI();
  });

  // 2. UI Updates
  function applySettingsToUI() {
    toggleEnabled.checked = currentSettings.enabled;
    toggleRemoveTail.checked = currentSettings.removeCopyrightTail;
    toggleForcePaste.checked = currentSettings.forcePaste;
    toggleFloatingPill.checked = currentSettings.showFloatingPill;
    toggleDeblur.checked = currentSettings.deblurStudySites;

    updateStatusBadge(currentSettings.enabled);
    updateLicenseUI(currentSettings.isProUser);
  }

  function updateStatusBadge(isEnabled) {
    if (isEnabled) {
      statusIndicator.classList.remove('disabled');
      statusText.textContent = 'Active';
    } else {
      statusIndicator.classList.add('disabled');
      statusText.textContent = 'Disabled';
    }
  }

  function updateLicenseUI(isPro) {
    if (isPro) {
      licenseBanner.classList.add('pro-active');
      licenseTier.textContent = 'PRO LIFETIME ACCESS';
      licenseDesc.textContent = 'All premium unlocking engines activated';
      btnUpgrade.textContent = 'Activated';
      btnUpgrade.disabled = true;
    } else {
      licenseBanner.classList.remove('pro-active');
      licenseTier.textContent = 'FREE EDITION';
      licenseDesc.textContent = 'Standard web unlocking enabled';
      btnUpgrade.textContent = 'Activate PRO';
      btnUpgrade.disabled = false;
    }
  }

  // 3. Save Settings & Broadcast
  function saveAndBroadcast() {
    currentSettings.enabled = toggleEnabled.checked;
    currentSettings.removeCopyrightTail = toggleRemoveTail.checked;
    currentSettings.forcePaste = toggleForcePaste.checked;
    currentSettings.showFloatingPill = toggleFloatingPill.checked;
    currentSettings.deblurStudySites = toggleDeblur.checked;

    chrome.storage.sync.set(currentSettings, () => {
      updateStatusBadge(currentSettings.enabled);
      broadcastConfigToActiveTab();
    });
  }

  function broadcastConfigToActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'UPDATE_CONFIG',
          config: currentSettings
        }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    });
  }

  // Bind Switch Events
  [toggleEnabled, toggleRemoveTail, toggleForcePaste, toggleFloatingPill, toggleDeblur].forEach((toggle) => {
    toggle.addEventListener('change', saveAndBroadcast);
  });

  // 4. Modal Interactions
  btnUpgrade.addEventListener('click', () => {
    if (!currentSettings.isProUser) {
      licenseModal.classList.add('open');
      inputLicenseKey.focus();
    }
  });

  btnCloseModal.addEventListener('click', () => {
    licenseModal.classList.remove('open');
    licenseModalStatus.textContent = '';
    licenseModalStatus.className = 'modal-status';
  });

  licenseModal.addEventListener('click', (e) => {
    if (e.target === licenseModal) {
      licenseModal.classList.remove('open');
    }
  });

  // 5. PRO License Validation Engine (Dual Offline Algorithm + Online Ready)
  btnSubmitLicense.addEventListener('click', () => {
    const rawKey = inputLicenseKey.value.trim().toUpperCase();
    if (!rawKey) {
      showModalStatus('Please enter a valid license key.', 'error');
      return;
    }

    showModalStatus('Verifying license...', '');

    // Algorithm Validation (EASYPRO-XXXX-XXXX-XXXX)
    if (validateLicenseKeyAlgorithm(rawKey)) {
      currentSettings.isProUser = true;
      currentSettings.licenseKey = rawKey;

      chrome.storage.sync.set(currentSettings, () => {
        showModalStatus('License successfully verified! Enjoy PRO Lifetime.', 'success');
        updateLicenseUI(true);
        broadcastConfigToActiveTab();
        setTimeout(() => {
          licenseModal.classList.remove('open');
        }, 1200);
      });
    } else {
      showModalStatus('Invalid license key. Please check and try again.', 'error');
    }
  });

  function showModalStatus(msg, type) {
    licenseModalStatus.textContent = msg;
    licenseModalStatus.className = `modal-status ${type}`;
  }

  /**
   * Cryptographic-style License Key Validator
   * Format: EASYPRO-XXXX-XXXX-XXXX
   * Validates checksum mathematically for instant offline activation
   */
  function validateLicenseKeyAlgorithm(key) {
    if (!key.startsWith('EASYPRO-')) return false;
    const parts = key.split('-');
    if (parts.length !== 4) return false;

    // Check character lengths
    if (parts[1].length !== 4 || parts[2].length !== 4 || parts[3].length !== 4) return false;

    // Checksum verification
    let sum = 0;
    const fullBody = parts[1] + parts[2] + parts[3];
    for (let i = 0; i < fullBody.length; i++) {
      sum += fullBody.charCodeAt(i);
    }
    // Any valid key produced by our generator will satisfy modulo condition
    return sum % 7 === 0;
  }

  // 6. Action: Extract Full Article as Markdown
  btnExtractArticle.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) return;

      btnExtractArticle.disabled = true;
      btnExtractArticle.querySelector('span').textContent = 'Extracting article...';

      chrome.tabs.sendMessage(tabs[0].id, { action: 'EXTRACT_ARTICLE' }, (res) => {
        btnExtractArticle.disabled = false;
        btnExtractArticle.querySelector('span').textContent = 'Extract Full Article as Markdown';

        if (chrome.runtime.lastError || !res || !res.data) {
          alert('Could not extract article content on this page.');
          return;
        }

        const data = res.data;
        downloadMarkdownFile(data.title, data.markdown);
      });
    });
  });

  function downloadMarkdownFile(title, content) {
    const sanitizedTitle = (title || 'document').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_').slice(0, 50);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});
