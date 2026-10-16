/**
 * EasyCopy PRO: Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener((details) => {
  const defaultSettings = {
    enabled: true,
    removeCopyrightTail: true,
    forcePaste: true,
    showFloatingPill: true,
    deblurStudySites: true,
    isProUser: false,
    licenseKey: ''
  };

  chrome.storage.sync.get(defaultSettings, (items) => {
    chrome.storage.sync.set(items);
    updateBadge(items.enabled);
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.enabled) {
    updateBadge(changes.enabled.newValue);
  }
});

function updateBadge(isEnabled) {
  if (isEnabled) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#16A34A' }); // Emerald Green
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#64748B' }); // Slate Gray
  }
}
