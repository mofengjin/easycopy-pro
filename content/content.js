/**
 * EasyCopy - 全网自由复制与网页限制解除核心引擎 (Content Script)
 * 纯净无广告，极速生效，严格零 Emoji 规范
 */

(function () {
  'use strict';

  // 全局配置状态 (默认开启)
  let config = {
    enabled: true,
    removeCopyrightTail: true,
    autoExpandArticle: true,
    superUnlock: true,
    showFloatingPill: true
  };

  const hostname = window.location.hostname;
  let lastSelectedText = ''; // 缓存最后一次选中的文本，防止网站脚本在点击瞬间恶意清空选区
  let floatingPillEl = null;

  // 0. 第一时间同步立即激活，绝不等待异步回调延迟
  console.log('[EasyCopy] 自由复制核心引擎已注入并激活 - 域名: ' + hostname);
  activateEasyCopy();

  // 1. 异步同步用户个性化配置与域名独立禁用
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['easycopy_config', `easycopy_disabled_${hostname}`], (res) => {
      if (res && res.easycopy_config) {
        config = Object.assign(config, res.easycopy_config);
      }
      if (res && res[`easycopy_disabled_${hostname}`]) {
        config.enabled = false;
        if (document.documentElement) {
          document.documentElement.classList.remove('easycopy-active');
        }
      }
    });
  }

  /**
   * 激活 EasyCopy 核心破解引擎
   */
  function activateEasyCopy() {
    // 0. 动态注入主上下文核心逆向引擎 (Page World 双轨保障)
    injectPageScript();

    // 1. 注入顶级 HTML 样式类
    if (document.documentElement) {
      document.documentElement.classList.add('easycopy-active');
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.add('easycopy-active');
      });
    }

    // 2. 劫持并阻断底层限制事件 (捕获阶段抢先拦截)
    hijackRestrictionEvents();

    // 3. 抹除内联与属性级事件监听器
    clearInlineEventHandlers();

    // 4. 重写剪贴板机制，粉碎版权小尾巴
    hijackClipboardEvents();

    // 4.1 全局强制允许粘贴引擎 (攻克网课、在线考试与表单禁止粘贴限制)
    initForcePasteEngine();

    // 5. 核心大招：全局拦截百度文库、知乎等自带的“复制/复制全文”按钮点击，斩断登录弹窗
    hijackPageCopyButtons();

    // 6. 初始化选中文本悬浮小胶囊
    initFloatingCopyPill();

    // 7. 页面就绪后清理动态遮罩、海外文库去模糊与自动展开全文
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady);
    } else {
      onDomReady();
    }
  }

  /**
   * 动态注入 Page World 脚本
   */
  function injectPageScript() {
    try {
      if (document.getElementById('easycopy-page-script')) return;
      const script = document.createElement('script');
      script.id = 'easycopy-page-script';
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        script.src = chrome.runtime.getURL('content/page-injector.js');
      }
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {}
  }

  /**
   * 劫持并阻断底层限制事件 (contextmenu, selectstart, mousedown 等)
   * 提示：copy 与 cut 专门交由专职的 hijackClipboardEvents() 统一接管写入与粉碎小尾巴
   */
  function hijackRestrictionEvents() {
    // 仅拦截真正用于防复制、防右键的关键事件，严禁拦截 dragstart 和 select 以免破坏拖拽、滑块拼图与原生选区
    const restrictionEvents = [
      'contextmenu',
      'selectstart',
      'beforecopy'
    ];

    restrictionEvents.forEach((eventType) => {
      window.addEventListener(
        eventType,
        (e) => {
          if (!config.enabled) return;

          // 若处于输入框、文本域或富文本编辑器，100% 放行自然交互
          const target = e.target;
          if (
            target &&
            (target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.isContentEditable ||
              (target.closest && target.closest('[contenteditable="true"]')))
          ) {
            return;
          }

          // 核心绝招：立即终止网站流氓脚本对右键和选择的恶意拦截
          e.stopImmediatePropagation();
        },
        true // 强行挂载在 window 捕获阶段最顶层
      );
    });

    // 智能处理键盘快捷键 (如 Ctrl+C)，处于输入框中时绝对不干涉浏览器原生操作
    window.addEventListener(
      'keydown',
      (e) => {
        if (!config.enabled) return;

        // 如果用户正在表单、输入框或富文本编辑器内打字，完全放行所有系统快捷键
        const target = e.target;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable ||
            (target.closest && target.closest('[contenteditable="true"]')))
        ) {
          return;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
          const selText = getEffectiveSelectedText();
          if (selText && selText.length > 0) {
            e.stopImmediatePropagation();
            copyTextToClipboard(selText);
            showCopyNotification(`已成功纯净复制 ${selText.length} 个字符 (Ctrl+C)`);
          }
        }
      },
      true
    );

    // 实时监听选区变动并更新文本缓存
    document.addEventListener('selectionchange', () => {
      const text = getRawSelectedText();
      if (text && text.length > 0) {
        lastSelectedText = text;
      }
    });
  }

  /**
   * 抹除原生属性监听器 (document.oncopy = ...)
   */
  function clearInlineEventHandlers() {
    const clearProps = () => {
      try {
        const nullProps = [
          'oncopy',
          'oncut',
          'oncontextmenu',
          'onselectstart',
          'onselect',
          'ondragstart'
        ];

        nullProps.forEach((prop) => {
          if (document[prop] !== null) document[prop] = null;
          if (window[prop] !== null) window[prop] = null;
          if (document.body && document.body[prop] !== null) document.body[prop] = null;
        });
      } catch (err) {}
    };

    clearProps();
    setInterval(clearProps, 2000);
  }

  /**
   * 彻底粉碎版权牛皮癣小尾巴
   */
  function hijackClipboardEvents() {
    window.addEventListener(
      'copy',
      (e) => {
        if (!config.enabled || !config.removeCopyrightTail) return;

        const selectedText = getEffectiveSelectedText();
        if (!selectedText || selectedText.length === 0) return;

        // 强行阻止网站向剪贴板写入拼接的版权垃圾小尾巴
        e.stopImmediatePropagation();
        e.preventDefault();

        // 双重通道写入纯文本
        if (e.clipboardData) {
          e.clipboardData.clearData();
          e.clipboardData.setData('text/plain', selectedText);
        }
        copyTextToClipboard(selectedText);
        showCopyNotification(`已成功纯净复制 ${selectedText.length} 个字符`);
      },
      true
    );
  }

  /**
   * 全局强制允许粘贴引擎 (攻克 Canvas LMS, Blackboard, HackerRank 等表单禁止粘贴)
   * 智能放行图片与富文本编辑器，彻底解决 Gemini/ChatGPT/Slack 无法粘贴图片的问题
   */
  function initForcePasteEngine() {
    window.addEventListener(
      'paste',
      (e) => {
        if (!config.enabled || config.forcePaste === false) return;

        // 如果剪贴板包含图片或文件，绝对不拦截，完整交给宿主应用（Gemini、ChatGPT 等）
        const cd = e.clipboardData;
        if (cd) {
          if (cd.files && cd.files.length > 0) return;
          if (cd.items) {
            const hasFileOrImage = Array.from(cd.items).some(
              (item) => item.kind === 'file' || (item.type && item.type.startsWith('image/'))
            );
            if (hasFileOrImage) return;
          }
        }

        const target = e.target;
        // 富文本编辑器（如 Gemini、Notion、Docs）不阻断传播
        if (target && target.isContentEditable) {
          if (target.onpaste !== null) target.onpaste = null;
          return;
        }

        // 普通输入框清除恶意 inline onpaste
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          if (target.onpaste !== null) target.onpaste = null;
        }
      },
      true
    );

    document.addEventListener(
      'keydown',
      (e) => {
        if (!config.enabled || config.forcePaste === false) return;

        if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
          const target = e.target;
          if (
            target &&
            (target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.isContentEditable)
          ) {
            if (target.onpaste !== null) target.onpaste = null;
          }
        }
      },
      true
    );
  }

  /**
   * 海外文库去模糊引擎 (针对 Scribd, Course Hero, Studocu)
   */
  function cleanStudySiteRestrictions() {
    if (!config.enabled || config.deblurStudySites === false) return;
    if (isSensitiveAuthPage()) return;

    // 清除各类毛玻璃模糊滤镜
    const blurredEls = document.querySelectorAll('.blurred_page, [class*="blurred"], [class*="blur_"], [class*="blur-"], [style*="filter: blur"], [style*="filter:blur"]');
    blurredEls.forEach((el) => {
      el.style.filter = 'none';
      el.style.webkitFilter = 'none';
      el.style.opacity = '1';
      el.style.userSelect = 'text';
    });

    // 隐藏海外文库订阅遮罩
    const paywalls = document.querySelectorAll('.paywall, [class*="paywall"], .banner-wrapper');
    paywalls.forEach((pw) => {
      if (pw.innerText.toLowerCase().includes('unlock') || pw.innerText.toLowerCase().includes('subscribe')) {
        pw.style.display = 'none';
      }
    });
  }

  /**
   * 核心大招：在特定文档阅读场景截胡特定悬浮气泡里的【复制】与【复制全文】点击
   * 彻底阻断其未登录/付费弹窗逻辑，直接把文本拷入剪贴板！
   */
  function hijackPageCopyButtons() {
    window.addEventListener(
      'click',
      (e) => {
        if (!config.enabled) return;
        // 敏感页面、认证后台绝对不干预任何点击事件
        if (isSensitiveAuthPage()) return;

        const target = e.target;
        if (!target) return;

        // 向上检索最近的按钮或可点击容器 (最多检索 5 层)
        const clickable = target.closest('button, [role="button"], a, div, span, li');
        if (!clickable) return;

        const text = (clickable.innerText || clickable.textContent || '').trim();
        const className = clickable.className && typeof clickable.className === 'string' ? clickable.className : '';
        const dataAction = clickable.getAttribute('data-action') || clickable.getAttribute('data-click') || '';

        // 1. 判定是否为“复制全文”按钮
        const isCopyAll =
          text === '复制全文' ||
          text.includes('复制全文') ||
          text === '全部复制' ||
          dataAction.includes('copyAll') ||
          dataAction.includes('copy-all');

        if (isCopyAll) {
          e.stopImmediatePropagation();
          e.preventDefault();

          const fullArticleText = extractReadableArticleText();
          if (fullArticleText && fullArticleText.length > 0) {
            copyTextToClipboard(fullArticleText);
            showCopyNotification(`已成功提取并复制文档全文 (${fullArticleText.length} 字)`);
          } else {
            showCopyNotification('未能提取到文档全文');
          }
          killLoginModals();
          return;
        }

        // 2. 判定是否为代码块的一键复制按钮 (专门通杀 CSDN、掘金、博客园等未登录复制代码限制)
        const isCodeCopyBtn =
          className.includes('hljs-button') ||
          clickable.getAttribute('data-title')?.includes('复制') ||
          clickable.getAttribute('data-title')?.includes('copy') ||
          text.includes('登录复制') ||
          text.includes('复制代码') ||
          text.includes('复制代码块') ||
          (clickable.closest('pre') && (text.includes('复制') || className.includes('copy') || className.includes('signin')));

        if (isCodeCopyBtn) {
          const pre = clickable.closest('pre') || clickable.parentElement?.closest('pre');
          if (pre) {
            e.stopImmediatePropagation();
            e.preventDefault();

            // 优先提取 code 或 pre 元素内的文本，剔除行号和按钮自身
            const codeEl = pre.querySelector('code') || pre;
            let codeText = '';
            if (codeEl) {
              const clone = codeEl.cloneNode(true);
              clone.querySelectorAll('.hljs-button, .pre-numbering, .code-copy-btn, button, style, script').forEach((el) => el.remove());
              codeText = clone.innerText || clone.textContent || '';
            }
            if (!codeText) {
              codeText = pre.innerText || pre.textContent || '';
            }
            codeText = codeText.trim();

            if (codeText.length > 0) {
              copyTextToClipboard(codeText);
              showCopyNotification(`已成功复制代码块全部代码 (${codeText.length} 字符)`);

              // 按钮临时变为“已复制”视觉反馈
              const oldTitle = clickable.getAttribute('data-title');
              if (oldTitle) {
                clickable.setAttribute('data-title', '已复制');
                setTimeout(() => {
                  try {
                    clickable.setAttribute('data-title', oldTitle);
                  } catch (err) {}
                }, 2000);
              }
              killLoginModals();
              return;
            }
          }
        }

        // 3. 判定是否为普通的“复制”按钮
        const isCopyBtn =
          text === '复制' ||
          text.startsWith('复制') ||
          className.includes('copy-btn') ||
          className.includes('copy-btn-text') ||
          className.includes('hx-popover-item') ||
          dataAction.includes('copy');

        if (isCopyBtn) {
          const selectedText = getEffectiveSelectedText();
          if (selectedText && selectedText.length > 0) {
            // 抢先拦截！彻底斩断后续百度的登录检测与弹窗！
            e.stopImmediatePropagation();
            e.preventDefault();

            copyTextToClipboard(selectedText);
            showCopyNotification(`已成功复制选中文本 (${selectedText.length} 字符)`);

            // 隐藏百度的黑色悬浮条与任何登录弹层
            hideWebsitePopovers();
            killLoginModals();
            return;
          }
        }
      },
      true // 必须挂在 window 捕获阶段最顶层！
    );
  }

  /**
   * 选中文本时展示原生悬浮复制小胶囊 (Floating Copy Pill)
   */
  let pillFadeTimer = null;
  let pillState = 'hidden'; // 'hidden', 'active', 'fading', 'hovered'

  /**
   * 选中文本时展示原生悬浮复制小胶囊 (Floating Copy Pill)
   * 严格遵循店主需求：失去焦点缓慢消失、鼠标进入平滑恢复、完全消失后只有重新选中才能呼出
   */
  function ensureFloatingPill() {
    if (floatingPillEl && document.contains(floatingPillEl)) return floatingPillEl;
    floatingPillEl = document.getElementById('easycopy-floating-pill');
    if (floatingPillEl) return floatingPillEl;

    floatingPillEl = document.createElement('div');
    floatingPillEl.id = 'easycopy-floating-pill';
    floatingPillEl.textContent = '复制';
    floatingPillEl.style.cssText = `
      position: fixed !important;
      z-index: 2147483647 !important;
      background: #0F172A !important;
      color: #F8FAFC !important;
      border: 1px solid #3B82F6 !important;
      border-radius: 6px !important;
      padding: 6px 14px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6) !important;
      cursor: pointer !important;
      user-select: none !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.2s ease, transform 0.2s ease, background-color 0.15s ease !important;
      transform: translateY(4px) scale(0.95) !important;
    `;

    (document.body || document.documentElement).appendChild(floatingPillEl);

    floatingPillEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    floatingPillEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = getEffectiveSelectedText();
      if (text && text.length > 0) {
        copyTextToClipboard(text);
        showCopyNotification(`已成功复制 ${text.length} 个字符`);
        hideFloatingPillImmediately();
      }
    });

    floatingPillEl.addEventListener('mouseenter', () => {
      if (pillState === 'hidden') return;
      clearTimeout(pillFadeTimer);
      pillState = 'hovered';
      floatingPillEl.style.opacity = '1';
      floatingPillEl.style.pointerEvents = 'auto';
      floatingPillEl.style.backgroundColor = '#1D4ED8';
      floatingPillEl.style.transform = 'translateY(0) scale(1.02)';
    });

    floatingPillEl.addEventListener('mouseleave', () => {
      if (pillState === 'hovered') {
        pillState = 'active';
        floatingPillEl.style.backgroundColor = '#0F172A';
        floatingPillEl.style.transform = 'translateY(0) scale(1)';
        startPillFadeOut(1000);
      }
    });

    return floatingPillEl;
  }

  function initFloatingCopyPill() {
    if (!config.showFloatingPill) return;

    const checkAndShowPill = () => {
      if (!config.enabled || !config.showFloatingPill) return;

      const text = getEffectiveSelectedText();
      if (text && text.length > 0) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect && (rect.width > 0 || rect.height > 0)) {
            const pill = ensureFloatingPill();
            const top = rect.top - 42;
            const left = rect.right - 50;
            pill.style.top = `${Math.max(12, top)}px`;
            pill.style.left = `${Math.max(12, Math.min(window.innerWidth - 90, left))}px`;

            clearTimeout(pillFadeTimer);
            pillState = 'active';
            pill.style.pointerEvents = 'auto';
            pill.style.opacity = '1';
            pill.style.transform = 'translateY(0) scale(1)';

            startPillFadeOut(2500);
            return;
          }
        }
      }
      hideFloatingPillImmediately();
    };

    // 1. 捕获阶段强行监听 mouseup (彻底击穿 CSDN 等网站的 stopPropagation 阻断)
    document.addEventListener(
      'mouseup',
      (e) => {
        if (e.target === floatingPillEl || (floatingPillEl && floatingPillEl.contains(e.target))) {
          return;
        }
        setTimeout(checkAndShowPill, 40);
      },
      true
    );

    // 2. 原生选区变动监听 (双轨保障，双击划词与多选 100% 呼出)
    let selTimer = null;
    document.addEventListener('selectionchange', () => {
      clearTimeout(selTimer);
      selTimer = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          if (pillState !== 'hovered') {
            hideFloatingPillImmediately();
          }
        } else {
          checkAndShowPill();
        }
      }, 150);
    });

    // 3. 捕获阶段监听空白处点击，干净利落隐藏
    document.addEventListener(
      'mousedown',
      (e) => {
        if (e.target !== floatingPillEl && (!floatingPillEl || !floatingPillEl.contains(e.target))) {
          hideFloatingPillImmediately();
        }
      },
      true
    );
  }

  // 启动平滑慢速淡出
  function startPillFadeOut(delayMs) {
    clearTimeout(pillFadeTimer);
    pillFadeTimer = setTimeout(() => {
      if (pillState === 'hovered' || pillState === 'hidden') return;
      pillState = 'fading';
      if (floatingPillEl) {
        floatingPillEl.style.transition = 'opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1), transform 1.5s ease';
        floatingPillEl.style.opacity = '0';
        floatingPillEl.style.transform = 'translateY(-4px) scale(0.96)';
      }
      // 1.5 秒淡出动画结束后，彻底隐藏并锁定为 hidden 状态 (必须重新划词才可呼出)
      clearTimeout(pillFadeTimer);
      pillFadeTimer = setTimeout(() => {
        if (pillState === 'fading') {
          hideFloatingPillImmediately();
        }
      }, 1500);
    }, delayMs);
  }

  // 彻底隐藏小气泡并锁定状态
  function hideFloatingPillImmediately() {
    clearTimeout(pillFadeTimer);
    pillState = 'hidden';
    if (floatingPillEl) {
      floatingPillEl.style.opacity = '0';
      floatingPillEl.style.pointerEvents = 'none';
      floatingPillEl.style.transform = 'translateY(2px) scale(0.96)';
    }
  }

  function hideFloatingPill() {
    hideFloatingPillImmediately();
  }

  /**
   * 获取当前有效选中文本 (带最后缓存容错)
   */
  function getRawSelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return '';
    return selection.toString().trim();
  }

  function getEffectiveSelectedText() {
    const current = getRawSelectedText();
    if (current && current.length > 0) {
      lastSelectedText = current;
      return current;
    }
    return lastSelectedText || '';
  }

  /**
   * 工业级双通道剪贴板写入 (兼容所有安全沙箱)
   */
  function copyTextToClipboard(text) {
    if (!text) return false;

    // 通道 1: 经典的 textarea + execCommand 同步执行 (在用户点击事件中具有极高可靠性)
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (e) {}

    // 通道 2: 现代原生 navigator.clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    return true;
  }

  /**
   * 隐藏网站自带的悬浮气泡
   */
  function hideWebsitePopovers() {
    const popoverSelectors = [
      '.hx-selection-popover',
      '.selection-popover',
      '.popover-wrap',
      '.doc-bubble',
      '.bubble-wrap',
      '.hx-popover'
    ];
    popoverSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      els.forEach((el) => {
        el.style.display = 'none';
      });
    });
  }

  /**
   * 判定当前页面是否为敏感的认证/登录/控制台页面
   * 在此类页面中，必须 100% 豁免任何 DOM 弹窗移除或页面元素隐藏，确保业务表单完好无损
   */
  function isSensitiveAuthPage() {
    const host = (window.location.hostname || '').toLowerCase();
    const path = (window.location.pathname || '').toLowerCase();
    return (
      host.includes('account.') ||
      host.includes('login.') ||
      host.includes('auth.') ||
      host.includes('signin.') ||
      host.includes('sso.') ||
      host.includes('pass.') ||
      host.includes('console.') ||
      host.includes('myseller.') ||
      host.includes('alipay.') ||
      path.includes('/login') ||
      path.includes('/signin') ||
      path.includes('/auth') ||
      path.includes('/oauth')
    );
  }

  /**
   * 仅针对特定已知文库（百度文库/360doc等）定向隐藏妨碍阅读的特定遮罩，绝不误伤通用网站与登录表单
   */
  function killLoginModals() {
    // 敏感认证、登录与管理页面绝对不执行任何弹窗清理
    if (isSensitiveAuthPage()) return;

    const host = (window.location.hostname || '').toLowerCase();
    const isTargetDocSite =
      host.includes('wenku.baidu.com') ||
      host.includes('360doc.com') ||
      host.includes('docin.com') ||
      host.includes('mbalib.com');

    if (!isTargetDocSite) return;

    // 仅在明确的文库域名下执行精准类名隐藏，且绝不物理 remove() 节点
    const docModalSelectors = [
      '#passport-login-pop',
      '#passport-login-pop-dialog',
      '.tang-pass-pop-login',
      '#vip-cashier-v2'
    ];

    docModalSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      els.forEach((el) => {
        el.style.display = 'none';
      });
    });

    if (document.body) {
      document.body.style.overflow = 'auto';
    }
  }

  /**
   * DOM 加载就绪后：清理内联限制样式、海外文库去模糊与展开折叠全文
   */
  function onDomReady() {
    cleanInlineStyles();
    killLoginModals();
    cleanStudySiteRestrictions();
    if (config.autoExpandArticle) {
      autoExpandArticles();
    }

    // 启动 MutationObserver 监听动态插入的内容（带 200ms 防抖，杜绝死循环卡顿）
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        cleanInlineStyles();
        killLoginModals();
        cleanStudySiteRestrictions();
        if (config.autoExpandArticle) {
          autoExpandArticles();
        }
      }, 200);
    });

    if (document.body || document.documentElement) {
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
  }

  /**
   * 清理元素上的内联 user-select: none
   */
  function cleanInlineStyles() {
    const elements = document.querySelectorAll('[style*="user-select"], [style*="none"]');
    elements.forEach((el) => {
      if (el.style && el.style.userSelect === 'none') {
        el.style.userSelect = 'text';
      }
      if (el.style && el.style.webkitUserSelect === 'none') {
        el.style.webkitUserSelect = 'text';
      }
    });
  }

  /**
   * 自动展开知乎、CSDN、百度文库、简书等平台的“阅读全文”折叠层
   */
  function autoExpandArticles() {
    // 登录认证与控制台页面坚决不执行自动展开点击
    if (isSensitiveAuthPage()) return;

    const expandSelectors = [
      '.btn-readmore',
      '.read-more-btn',
      '.readmore-btn',
      '.show-more-btn',
      '.unfold-btn',
      '.open-read-box',
      '.article-readmore',
      '.expand-all',
      '.fold-page-text',
      '.read-all',
      'button[data-click*="readmore"]'
    ];

    expandSelectors.forEach((sel) => {
      const btns = document.querySelectorAll(sel);
      btns.forEach((btn) => {
        if (btn && btn.offsetParent !== null) {
          try {
            btn.click();
            btn.style.display = 'none';
          } catch (e) {}
        }
      });
    });

    const containerSelectors = [
      '#article_content',
      '.article_content',
      '.rich_media_content',
      '.entry-content',
      '.post-content',
      '.article-wrapper',
      '.markdown-body',
      '.reader-container',
      '.mod-doc-content',
      '.hx-article-content',
      'article'
    ];

    containerSelectors.forEach((sel) => {
      const container = document.querySelector(sel);
      if (container) {
        container.style.maxHeight = 'none';
        container.style.height = 'auto';
        container.style.overflow = 'visible';
      }
    });
  }

  /**
   * 页面轻量纯净提示条 (Toast)
   */
  function showCopyNotification(msg) {
    let toast = document.getElementById('easycopy-notification-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'easycopy-notification-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0F172A;
        color: #F8FAFC;
        border: 1px solid #10B981;
        border-radius: 6px;
        padding: 10px 18px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        z-index: 2147483647;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
        opacity: 0;
        transform: translateY(10px);
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 2000);
  }

  // ==========================================
  // 响应来自扩展控制面板 (Popup) 的指令
  // ==========================================
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'GET_STATUS') {
        sendResponse({
          enabled: config.enabled,
          hostname: hostname
        });
      } else if (request.action === 'TOGGLE_STATUS') {
        config.enabled = request.enabled;
        if (config.enabled) {
          activateEasyCopy();
          showCopyNotification('EasyCopy: 自由复制限制解除已启用');
        } else {
          if (document.documentElement) {
            document.documentElement.classList.remove('easycopy-active');
          }
          hideFloatingPill();
          showCopyNotification('EasyCopy: 已暂停限制解除');
        }
        sendResponse({ success: true, enabled: config.enabled });
      } else if (request.action === 'EXTRACT_FULL_TEXT') {
        (async () => {
          let mainText = '';
          if (hostname.includes('wenku.baidu.com')) {
            mainText = await requestMainWorldFullText();
          }
          if (!mainText || mainText.length === 0) {
            mainText = extractReadableArticleText();
          }
          if (mainText && mainText.length > 0) {
            copyTextToClipboard(mainText);
            showCopyNotification(`已成功提取并复制正文全文 (${mainText.length} 字)`);
            sendResponse({ success: true, count: mainText.length });
          } else {
            sendResponse({ success: false, message: '未能识别出网页正文内容' });
          }
        })();
        return true;
      }
    });
  }

  /**
   * 向主上下文请求提取全文
   */
  function requestMainWorldFullText() {
    return new Promise((resolve) => {
      let timer = null;
      const onMsg = (e) => {
        if (e.data && e.data.type === 'EASYCOPY_RES_FULL_TEXT') {
          window.removeEventListener('message', onMsg);
          clearTimeout(timer);
          resolve(e.data.text || '');
        }
      };
      window.addEventListener('message', onMsg);
      window.postMessage({ type: 'EASYCOPY_REQ_FULL_TEXT' }, '*');
      timer = setTimeout(() => {
        window.removeEventListener('message', onMsg);
        resolve('');
      }, 1500);
    });
  }

  /**
   * 终极正文抓取启发式算法 (专门深度适配百度文库等平台)
   */
  function extractReadableArticleText() {
    // 1. 针对 Bilibili 等视频页面的智能标题与简介提取
    if (location.hostname.includes('bilibili.com')) {
      const videoTitle = document.querySelector('h1.video-title, .video-info-title')?.innerText?.trim() || '';
      const upName = document.querySelector('.up-name, .up-detail-top .up-name, .username')?.innerText?.trim() || '';
      const videoDesc = document.querySelector('.desc-info-text, .basic-desc-info, .video-desc')?.innerText?.trim() || '';
      if (videoTitle || videoDesc) {
        const parts = [];
        if (videoTitle) parts.push(`【视频标题】${videoTitle}`);
        if (upName) parts.push(`【UP主】${upName}`);
        if (videoDesc) parts.push(`【视频简介】\n${videoDesc}`);
        return cleanExtractedText(parts.join('\n\n'));
      }
    }

    // 2. 优先检测百度文库文字排版层
    const wenkuWords = document.querySelectorAll('.reader-word-layer, .doc-reader p, .reader-container p');
    if (wenkuWords && wenkuWords.length > 0) {
      const paragraphs = [];
      wenkuWords.forEach((el) => {
        const t = (el.innerText || el.textContent || '').trim();
        if (t.length > 0) {
          paragraphs.push(t);
        }
      });
      if (paragraphs.length > 0) {
        return cleanExtractedText(paragraphs.join('\n\n'));
      }
    }

    // 3. 通用文章容器检测
    const candidates = [
      'article',
      '.article_content',
      '#article_content',
      '.rich_media_content',
      '.entry-content',
      '.post-content',
      '.markdown-body',
      '.mod-doc-content',
      '.reader-container',
      '.content-box',
      'main'
    ];

    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 100) {
        return cleanExtractedText(el.innerText);
      }
    }

    return cleanExtractedText(document.body ? document.body.innerText : '');
  }

  function cleanExtractedText(raw) {
    if (!raw) return '';
    return raw
      .replace(/[\r\n]{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
})();
