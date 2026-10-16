/**
 * EasyCopy Popup 交互控制器
 * 严格零 Emoji 规范
 */

document.addEventListener('DOMContentLoaded', async () => {
  const toggleGlobal = document.getElementById('toggle-global');
  const toggleCurrentSite = document.getElementById('toggle-current-site');
  const toggleCleanTail = document.getElementById('toggle-clean-tail');
  const toggleAutoExpand = document.getElementById('toggle-auto-expand');
  const toggleForcePaste = document.getElementById('toggle-force-paste');
  const toggleDeblur = document.getElementById('toggle-deblur');
  const currentHostDesc = document.getElementById('current-host-desc');
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const btnExtract = document.getElementById('btn-extract-article');

  // 获取当前活动标签页
  let currentTab = null;
  let currentHostname = '';

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      currentTab = tabs[0];
      if (currentTab.url && currentTab.url.startsWith('http')) {
        const urlObj = new URL(currentTab.url);
        currentHostname = urlObj.hostname;
        currentHostDesc.textContent = `域名: ${currentHostname}`;
      } else {
        currentHostDesc.textContent = '本地页面或内置页面';
        toggleCurrentSite.disabled = true;
      }
    }
  } catch (e) {
    currentHostDesc.textContent = '未检测到活跃网页';
  }

  // 读取配置
  chrome.storage.sync.get(['easycopy_config', `easycopy_disabled_${currentHostname}`], (res) => {
    const config = res.easycopy_config || {
      enabled: true,
      removeCopyrightTail: true,
      autoExpandArticle: true,
      forcePaste: true,
      deblurStudySites: true,
      superUnlock: true
    };

    toggleGlobal.checked = config.enabled;
    toggleCleanTail.checked = config.removeCopyrightTail !== false;
    toggleAutoExpand.checked = config.autoExpandArticle !== false;
    if (toggleForcePaste) toggleForcePaste.checked = config.forcePaste !== false;
    if (toggleDeblur) toggleDeblur.checked = config.deblurStudySites !== false;

    // 当前站点是否被单独禁用
    const isSiteDisabled = Boolean(res[`easycopy_disabled_${currentHostname}`]);
    toggleCurrentSite.checked = !isSiteDisabled;

    updateStatusUI(config.enabled && !isSiteDisabled);
  });

  // 全局开关切换
  toggleGlobal.addEventListener('change', () => {
    const enabled = toggleGlobal.checked;
    saveConfig({ enabled });
    updateStatusUI(enabled && toggleCurrentSite.checked);

    // 通知后台更新 Badge
    chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', enabled });

    // 通知当前标签页
    if (currentTab && currentTab.id) {
      chrome.tabs.sendMessage(currentTab.id, { action: 'TOGGLE_STATUS', enabled });
    }
  });

  // 当前网站开关切换
  toggleCurrentSite.addEventListener('change', () => {
    if (!currentHostname) return;
    const isAllowed = toggleCurrentSite.checked;
    const key = `easycopy_disabled_${currentHostname}`;

    if (isAllowed) {
      chrome.storage.sync.remove(key);
    } else {
      chrome.storage.sync.set({ [key]: true });
    }

    updateStatusUI(toggleGlobal.checked && isAllowed);

    if (currentTab && currentTab.id) {
      chrome.tabs.sendMessage(currentTab.id, {
        action: 'TOGGLE_STATUS',
        enabled: toggleGlobal.checked && isAllowed
      });
    }
  });

  // 清除版权小尾巴开关
  toggleCleanTail.addEventListener('change', () => {
    saveConfig({ removeCopyrightTail: toggleCleanTail.checked });
  });

  // 自动展开全文开关
  toggleAutoExpand.addEventListener('change', () => {
    saveConfig({ autoExpandArticle: toggleAutoExpand.checked });
  });

  // 强制允许粘贴开关
  if (toggleForcePaste) {
    toggleForcePaste.addEventListener('change', () => {
      saveConfig({ forcePaste: toggleForcePaste.checked });
    });
  }

  // 海外文库去模糊开关
  if (toggleDeblur) {
    toggleDeblur.addEventListener('change', () => {
      saveConfig({ deblurStudySites: toggleDeblur.checked });
    });
  }

  // 一键提取网页正文全文
  // 一键提取网页正文全文 (带自动热注入与容错)
  btnExtract.addEventListener('click', () => {
    if (!currentTab || !currentTab.id) {
      btnExtract.textContent = '当前页面无法提取';
      setTimeout(() => (btnExtract.textContent = '一键提取网页正文全文到剪贴板'), 1500);
      return;
    }

    btnExtract.textContent = '正在提取正文...';
    btnExtract.disabled = true;

    const doExtract = (cb) => {
      chrome.tabs.sendMessage(currentTab.id, { action: 'EXTRACT_FULL_TEXT' }, (response) => {
        cb(response, chrome.runtime.lastError);
      });
    };

    doExtract(async (response, err) => {
      if (err) {
        // 连接未建立，自动动态补注脚本
        try {
          if (chrome.scripting) {
            await chrome.scripting.insertCSS({ target: { tabId: currentTab.id }, files: ['content/content.css'] }).catch(() => {});
            await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ['content/content.js'] });
            setTimeout(() => {
              doExtract((retryRes, retryErr) => {
                handleExtractResult(retryRes, retryErr);
              });
            }, 150);
            return;
          }
        } catch (e) {}
      }
      handleExtractResult(response, err);
    });

    function handleExtractResult(response, err) {
      if (err) {
        btnExtract.textContent = '请刷新网页(F5)后使用';
      } else if (!response || !response.success) {
        btnExtract.textContent = '此页面无图文正文可提取';
      } else {
        btnExtract.textContent = `成功复制正文 (${response.count} 字)`;
      }

      setTimeout(() => {
        btnExtract.textContent = '一键提取网页正文全文到剪贴板';
        btnExtract.disabled = false;
      }, 2200);
    }
  });

  function saveConfig(patch) {
    chrome.storage.sync.get(['easycopy_config'], (res) => {
      const current = res.easycopy_config || {};
      const updated = Object.assign(current, patch);
      chrome.storage.sync.set({ easycopy_config: updated });
    });
  }

  function updateStatusUI(isActive) {
    if (isActive) {
      statusIndicator.classList.remove('status-disabled');
      statusText.textContent = '全网限制已解除';
    } else {
      statusIndicator.classList.add('status-disabled');
      statusText.textContent = '限制解除已暂停';
    }
  }
});
