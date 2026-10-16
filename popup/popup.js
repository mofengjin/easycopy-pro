/**
 * EasyCopy PRO: Popup Controller (Global Edition with Full i18n Engine)
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
  const btnToggleLang = document.getElementById('btnToggleLang');

  const btnExtractArticle = document.getElementById('btnExtractArticle');

  // Modal Elements
  const licenseModal = document.getElementById('licenseModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const inputLicenseKey = document.getElementById('inputLicenseKey');
  const btnSubmitLicense = document.getElementById('btnSubmitLicense');
  const licenseModalStatus = document.getElementById('licenseModalStatus');

  const btnOpenSponsor = document.getElementById('btnOpenSponsor');
  const sponsorModal = document.getElementById('sponsorModal');
  const btnCloseSponsorModal = document.getElementById('btnCloseSponsorModal');

  const I18N_DICT = {
    en: {
      tagline: 'Universal Selection & Copy Unlocker',
      statusActive: 'Active',
      statusDisabled: 'Disabled',
      freeTier: 'FREE EDITION',
      freeTierDesc: 'Standard web unlocking enabled',
      proTier: 'PRO LIFETIME ACCESS',
      proTierDesc: 'All premium unlocking engines activated',
      btnActivatePro: 'Activate PRO',
      btnActivated: 'Activated',
      masterProtectionTitle: 'Master Protection',
      masterProtectionDesc: 'Enable all unlocking features',
      cleanCopyTitle: 'Clean Clipboard Copy',
      cleanCopyDesc: 'Strip copyright notice tails & spam',
      forcePasteTitle: 'Force Paste (Bypass Limits)',
      forcePasteDesc: 'Allow pasting in restricted forms & tests',
      floatingPillTitle: 'Quick Floating Pill',
      floatingPillDesc: 'Show auto-fading copy bubble on select',
      deblurTitle: 'Study Sites De-blur',
      deblurDesc: 'Remove blur on Scribd, Course Hero & papers',
      extractArticleBtn: 'Extract Full Article as Markdown',
      recommendedTool: 'RECOMMENDED TOOL',
      byCreator: 'By Creator',
      promoTitle: 'Amazon PPC & Profit Optimizer (5-in-1)',
      promoDesc: 'Zero ad waste calculator & bulk negative keyword generator for e-commerce sellers.',
      learnMore: 'Learn More &rarr;',
      footerOffline: '100% Offline & Private',
      modalTitle: 'Unlock PRO Lifetime Access',
      modalDesc: 'Enter your Gumroad license key below to unlock Study Sites De-blur, One-Click Article Extractor and priority updates.',
      modalActivateBtn: 'Activate License',
      modalGetLicenseBtn: 'Get Key on Gumroad ($4.99)',
      btnLangToggle: '中文',
      btnSponsor: 'Sponsor',
      sponsorTitle: 'Support the Creator',
      sponsorDesc: 'If EasyCopy PRO has helped you, buy the creator a cold soda or support via WeChat / Gumroad!',
      sponsorWeChatTitle: 'WeChat Pay (Scan to Sponsor)',
      sponsorGumroadBtn: 'Support on Gumroad (Pay What You Want)'
    },
    zh_CN: {
      tagline: '全网文本选中与右键复制解锁器',
      statusActive: '运行中',
      statusDisabled: '已关闭',
      freeTier: '免费标准版',
      freeTierDesc: '基础网页解锁功能已开启',
      proTier: 'PRO 尊享商业版',
      proTierDesc: '全套高级破解引擎已全部激活',
      btnActivatePro: '激活 PRO',
      btnActivated: '已激活',
      masterProtectionTitle: '核心总开关',
      masterProtectionDesc: '一键启用全部破除限制功能',
      cleanCopyTitle: '纯净剪贴板复制',
      cleanCopyDesc: '自动剔除版权尾巴与垃圾跟踪参数',
      forcePasteTitle: '万能强制粘贴 (破除限制)',
      forcePasteDesc: '允许在受限的考试输入框与求职网申表单中粘贴',
      floatingPillTitle: '划词快捷气泡',
      floatingPillDesc: '划词后平滑淡出复制小图标',
      deblurTitle: '付费文库一键去模糊',
      deblurDesc: '移除文库论文中的虚化遮罩与模糊滤镜',
      extractArticleBtn: '整篇长文一键导出为纯净 Markdown',
      recommendedTool: '官方推荐工具',
      byCreator: '开发者精选',
      promoTitle: '亚马逊广告死词与利润双核清道夫 (5合1)',
      promoDesc: '跨境卖家广告预算零浪费诊断工具与大批量否定关键词生成器。',
      learnMore: '了解更多 &rarr;',
      footerOffline: '100% 本地离线执行 · 隐私零泄露',
      modalTitle: '激活 PRO 尊享版终身授权',
      modalDesc: '输入您的 Gumroad 激活码，解锁付费文库去模糊、长文一键导出 Markdown 及优先技术更新。',
      modalActivateBtn: '立即激活授权',
      modalGetLicenseBtn: '在 Gumroad 赞助获取授权码 ($4.99)',
      btnLangToggle: 'EN',
      btnSponsor: '请喝阔乐',
      sponsorTitle: '请作者喝瓶冰阔乐吧！',
      sponsorDesc: '感谢您的使用与支持！如果 EasyCopy PRO 帮到了您，欢迎扫码请作者喝瓶冰阔乐，您的鼓励是持续维护的最大动力！',
      sponsorWeChatTitle: '微信扫码赞赏',
      sponsorGumroadBtn: '海外赞助通道 Gumroad (Pay What You Want)'
    }
  };

  let currentSettings = {
    enabled: true,
    removeCopyrightTail: true,
    forcePaste: true,
    showFloatingPill: true,
    deblurStudySites: true,
    isProUser: false,
    licenseKey: '',
    userLang: 'auto'
  };

  function getActiveLang() {
    if (currentSettings.userLang && currentSettings.userLang !== 'auto') {
      return currentSettings.userLang;
    }
    const sysLang = navigator.language || navigator.userLanguage || '';
    return sysLang.toLowerCase().startsWith('zh') ? 'zh_CN' : 'en';
  }

  function applyI18n() {
    const lang = getActiveLang();
    const dict = I18N_DICT[lang] || I18N_DICT.en;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        if (dict[key].includes('&rarr;')) {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });

    if (btnToggleLang) {
      btnToggleLang.textContent = dict.btnLangToggle;
    }

    updateStatusBadge(currentSettings.enabled);
    updateLicenseUI(currentSettings.isProUser);
  }

  // 1. Load Stored Settings
  chrome.storage.sync.get(currentSettings, (items) => {
    currentSettings = { ...currentSettings, ...items };
    applyI18n();
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
    const lang = getActiveLang();
    const dict = I18N_DICT[lang] || I18N_DICT.en;
    if (isEnabled) {
      statusIndicator.classList.remove('disabled');
      statusText.textContent = dict.statusActive;
    } else {
      statusIndicator.classList.add('disabled');
      statusText.textContent = dict.statusDisabled;
    }
  }

  function updateLicenseUI(isPro) {
    const lang = getActiveLang();
    const dict = I18N_DICT[lang] || I18N_DICT.en;
    if (isPro) {
      licenseBanner.classList.add('pro-active');
      licenseTier.textContent = dict.proTier;
      licenseDesc.textContent = dict.proTierDesc;
      btnUpgrade.textContent = dict.btnActivated;
      btnUpgrade.disabled = true;
    } else {
      licenseBanner.classList.remove('pro-active');
      licenseTier.textContent = dict.freeTier;
      licenseDesc.textContent = dict.freeTierDesc;
      btnUpgrade.textContent = dict.btnActivatePro;
      btnUpgrade.disabled = false;
    }
  }

  if (btnToggleLang) {
    btnToggleLang.addEventListener('click', () => {
      const currentActive = getActiveLang();
      currentSettings.userLang = currentActive === 'zh_CN' ? 'en' : 'zh_CN';
      chrome.storage.sync.set({ userLang: currentSettings.userLang }, () => {
        applyI18n();
      });
    });
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

  // 7. Action: Sponsor / Donate Modal Controls
  if (btnOpenSponsor && sponsorModal) {
    btnOpenSponsor.addEventListener('click', () => {
      sponsorModal.classList.add('active');
    });
  }

  if (btnCloseSponsorModal && sponsorModal) {
    btnCloseSponsorModal.addEventListener('click', () => {
      sponsorModal.classList.remove('active');
    });
  }

  if (sponsorModal) {
    sponsorModal.addEventListener('click', (e) => {
      if (e.target === sponsorModal) {
        sponsorModal.classList.remove('active');
      }
    });
  }
});
