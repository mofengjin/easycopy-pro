/**
 * EasyCopy PRO: Universal Right Click, Copy & Content Extractor
 * Manifest V3 Content Script (Global Edition)
 */

(() => {
  'use strict';

  // Default Configuration
  let config = {
    enabled: true,
    removeCopyrightTail: true,
    forcePaste: true,
    showFloatingPill: true,
    deblurStudySites: true,
    isProUser: false
  };

  let floatingPillEl = null;
  let lastSelectedText = '';
  let pillFadeTimer = null;
  let pillState = 'hidden'; // 'hidden', 'active', 'fading', 'hovered'

  // Initialize
  init();

  function init() {
    loadSettings(() => {
      if (!config.enabled) return;

      if (document.documentElement) {
        document.documentElement.classList.add('easycopy-active');
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.classList.add('easycopy-active');
        });
      }

      hijackRestrictionEvents();
      clearInlineEventHandlers();
      hijackClipboardEvents();
      initForcePasteEngine();
      hijackPageCopyButtons();
      initFloatingCopyPill();

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDomReady);
      } else {
        onDomReady();
      }
    });

    listenForRuntimeMessages();
  }

  function loadSettings(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(config, (items) => {
        if (items) config = { ...config, ...items };
        if (callback) callback();
      });
    } else if (callback) {
      callback();
    }
  }

  function listenForRuntimeMessages() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'UPDATE_CONFIG') {
        config = { ...config, ...request.config };
        if (config.enabled) {
          document.documentElement.classList.add('easycopy-active');
        } else {
          document.documentElement.classList.remove('easycopy-active');
          hideFloatingPillImmediately();
        }
        sendResponse({ status: 'ok' });
      } else if (request.action === 'EXTRACT_ARTICLE') {
        const articleData = extractReadableArticleMarkdown();
        sendResponse({ status: 'ok', data: articleData });
      } else if (request.action === 'PING') {
        sendResponse({ status: 'pong', enabled: config.enabled, isPro: config.isProUser });
      }
      return true;
    });
  }

  /**
   * 1. Intercept restriction events at the top capture phase
   */
  function hijackRestrictionEvents() {
    const restrictionEvents = [
      'contextmenu',
      'selectstart',
      'select',
      'beforecopy',
      'dragstart'
    ];

    restrictionEvents.forEach((eventType) => {
      window.addEventListener(
        eventType,
        (e) => {
          if (!config.enabled) return;

          const target = e.target;
          if (
            target &&
            (target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.isContentEditable)
          ) {
            return;
          }

          // Terminate website restrictions immediately
          e.stopImmediatePropagation();
        },
        true
      );
    });

    // Keyboard Shortcuts Guard
    window.addEventListener(
      'keydown',
      (e) => {
        if (!config.enabled) return;

        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
          e.stopImmediatePropagation();
          const selText = getEffectiveSelectedText();
          if (selText && selText.length > 0) {
            copyTextToClipboard(selText);
            showCopyNotification(`Copied ${selText.length} characters (Ctrl+C)`);
          }
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
          e.stopImmediatePropagation();
        }
      },
      true
    );

    document.addEventListener('selectionchange', () => {
      const text = getRawSelectedText();
      if (text && text.length > 0) {
        lastSelectedText = text;
      }
    });
  }

  /**
   * 2. Clear inline event handlers (oncopy, oncontextmenu, onselectstart)
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
    setInterval(clearProps, 2500);
  }

  /**
   * 3. Clean Clipboard & Strip Copyright Notices
   */
  function hijackClipboardEvents() {
    window.addEventListener(
      'copy',
      (e) => {
        if (!config.enabled || !config.removeCopyrightTail) return;

        const selectedText = getEffectiveSelectedText();
        if (!selectedText || selectedText.length === 0) return;

        // Stop malicious copyright tampering
        e.stopImmediatePropagation();
        e.preventDefault();

        if (e.clipboardData) {
          e.clipboardData.clearData();
          e.clipboardData.setData('text/plain', selectedText);
        }
        copyTextToClipboard(selectedText);
        showCopyNotification(`Clean copy: ${selectedText.length} characters`);
      },
      true
    );
  }

  /**
   * 4. Universal Force Paste Engine (Bypass form & online test paste limits)
   * Safely bypasses malicious paste restrictions without breaking image/file paste in Gemini, Slack, ChatGPT, etc.
   */
  function initForcePasteEngine() {
    window.addEventListener(
      'paste',
      (e) => {
        if (!config.enabled || !config.forcePaste) return;

        // If clipboard contains files or images, NEVER intercept. Let host apps (Gemini, ChatGPT, Discord) handle them naturally.
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
        // Don't stop propagation on rich text editors unless they are actively blocked by inline onpaste
        if (target && target.isContentEditable) {
          if (target.onpaste !== null) target.onpaste = null;
          return;
        }

        // For stubborn standard inputs / textareas with onpaste="return false", clear inline blocks
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          if (target.onpaste !== null) target.onpaste = null;
        }
      },
      true
    );

    document.addEventListener(
      'keydown',
      (e) => {
        if (!config.enabled || !config.forcePaste) return;

        if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
          const target = e.target;
          if (
            target &&
            (target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.isContentEditable)
          ) {
            // Clear any inline onpaste block without stopping keyboard propagation
            if (target.onpaste !== null) target.onpaste = null;
          }
        }
      },
      true
    );
  }

  /**
   * 5. Smart Hijack for Code Blocks and Copy Buttons
   */
  function hijackPageCopyButtons() {
    window.addEventListener(
      'click',
      (e) => {
        if (!config.enabled) return;

        const target = e.target;
        if (!target) return;

        const clickable = target.closest('button, [role="button"], a, div, span, li');
        if (!clickable) return;

        const text = (clickable.innerText || clickable.textContent || '').trim().toLowerCase();
        const className = clickable.className && typeof clickable.className === 'string' ? clickable.className : '';
        const dataTitle = (clickable.getAttribute('data-title') || clickable.getAttribute('title') || '').toLowerCase();

        // Check if this is a code block copy button
        const isCodeCopyBtn =
          className.includes('hljs-button') ||
          className.includes('copy-button') ||
          className.includes('copy-code') ||
          dataTitle.includes('copy') ||
          text === 'copy' ||
          text.includes('copy code') ||
          clickable.closest('pre');

        if (isCodeCopyBtn && (clickable.closest('pre') || clickable.parentElement?.closest('pre'))) {
          const pre = clickable.closest('pre') || clickable.parentElement?.closest('pre');
          if (pre) {
            e.stopImmediatePropagation();
            e.preventDefault();

            const codeEl = pre.querySelector('code') || pre;
            let codeText = '';
            if (codeEl) {
              const clone = codeEl.cloneNode(true);
              clone.querySelectorAll('.hljs-button, .pre-numbering, button, style, script').forEach(el => el.remove());
              codeText = clone.innerText || clone.textContent || '';
            }
            if (!codeText) codeText = pre.innerText || pre.textContent || '';
            codeText = codeText.trim();

            if (codeText.length > 0) {
              copyTextToClipboard(codeText);
              showCopyNotification(`Copied code block (${codeText.length} chars)`);

              const oldText = clickable.innerText;
              clickable.innerText = 'Copied!';
              setTimeout(() => {
                try { clickable.innerText = oldText; } catch (err) {}
              }, 1800);
              return;
            }
          }
        }

        // Generic copy button
        const isGenericCopy = text === 'copy' || text.startsWith('copy ') || className.includes('copy-btn');
        if (isGenericCopy) {
          const sel = getEffectiveSelectedText();
          if (sel && sel.length > 0) {
            e.stopImmediatePropagation();
            e.preventDefault();
            copyTextToClipboard(sel);
            showCopyNotification(`Copied ${sel.length} characters`);
          }
        }
      },
      true
    );
  }

  /**
   * 6. Floating Action Pill (Smooth Lifecycle State Machine)
   */
  function initFloatingCopyPill() {
    if (!config.showFloatingPill) return;

    floatingPillEl = document.createElement('div');
    floatingPillEl.id = 'easycopy-floating-pill';
    floatingPillEl.textContent = 'Copy';
    document.documentElement.appendChild(floatingPillEl);

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
        floatingPillEl.textContent = 'Copied!';
        floatingPillEl.style.backgroundColor = '#16A34A';
        setTimeout(() => {
          hideFloatingPillImmediately();
          floatingPillEl.textContent = 'Copy';
          floatingPillEl.style.backgroundColor = 'rgba(15, 23, 42, 0.94)';
        }, 500);
        showCopyNotification(`Copied ${text.length} characters`);
      }
    });

    floatingPillEl.addEventListener('mouseenter', () => {
      if (pillState === 'hidden') return;
      clearTimeout(pillFadeTimer);
      pillState = 'hovered';
      floatingPillEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease, background-color 0.15s ease';
      floatingPillEl.style.opacity = '1';
      floatingPillEl.style.transform = 'translateY(0) scale(1.02)';
      floatingPillEl.style.backgroundColor = '#2563EB';
    });

    floatingPillEl.addEventListener('mouseleave', () => {
      if (pillState === 'hovered') {
        pillState = 'active';
        floatingPillEl.style.backgroundColor = 'rgba(15, 23, 42, 0.94)';
        floatingPillEl.style.transform = 'translateY(0) scale(1)';
        startPillFadeOut(800);
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (!config.enabled || !config.showFloatingPill) return;

      if (e.target === floatingPillEl || (floatingPillEl && floatingPillEl.contains(e.target))) {
        return;
      }

      setTimeout(() => {
        const text = getEffectiveSelectedText();
        if (text && text.length > 0) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect && rect.width > 0 && rect.height > 0) {
              const top = window.scrollY + rect.top - 38;
              const left = window.scrollX + rect.right - 45;
              floatingPillEl.style.top = `${Math.max(10, top)}px`;
              floatingPillEl.style.left = `${Math.max(10, left)}px`;

              clearTimeout(pillFadeTimer);
              pillState = 'active';
              floatingPillEl.textContent = 'Copy';
              floatingPillEl.style.pointerEvents = 'auto';
              floatingPillEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
              floatingPillEl.style.opacity = '1';
              floatingPillEl.style.transform = 'translateY(0) scale(1)';

              startPillFadeOut(1500);
              return;
            }
          }
        }
        hideFloatingPillImmediately();
      }, 80);
    });

    document.addEventListener('mousedown', (e) => {
      if (e.target !== floatingPillEl && (!floatingPillEl || !floatingPillEl.contains(e.target))) {
        hideFloatingPillImmediately();
      }
    });
  }

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
      clearTimeout(pillFadeTimer);
      pillFadeTimer = setTimeout(() => {
        if (pillState === 'fading') {
          hideFloatingPillImmediately();
        }
      }, 1500);
    }, delayMs);
  }

  function hideFloatingPillImmediately() {
    clearTimeout(pillFadeTimer);
    pillState = 'hidden';
    if (floatingPillEl) {
      floatingPillEl.style.opacity = '0';
      floatingPillEl.style.pointerEvents = 'none';
      floatingPillEl.style.transform = 'translateY(2px) scale(0.96)';
    }
  }

  /**
   * 7. Study Sites De-blur & Paywall Cleaner (Scribd, Course Hero, Studocu)
   */
  function cleanStudySiteRestrictions() {
    if (!config.enabled || !config.deblurStudySites) return;

    // Remove blur filters
    const blurredEls = document.querySelectorAll('.blurred_page, [class*="blurred"], [class*="blur_"], [class*="blur-"]');
    blurredEls.forEach((el) => {
      el.style.filter = 'none';
      el.style.webkitFilter = 'none';
      el.style.opacity = '1';
      el.style.userSelect = 'text';
    });

    // Remove Paywall Overlays
    const paywalls = document.querySelectorAll('.paywall, [class*="paywall"], .banner-wrapper, .modal-backdrop, .overlay-container');
    paywalls.forEach((pw) => {
      if (pw.innerText.toLowerCase().includes('unlock') || pw.innerText.toLowerCase().includes('subscribe')) {
        pw.style.display = 'none';
      }
    });
  }

  function onDomReady() {
    cleanStudySiteRestrictions();

    const observer = new MutationObserver(() => {
      cleanStudySiteRestrictions();
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  /**
   * 8. Full Article & Paper Extractor (Markdown / Clean Text)
   */
  function extractReadableArticleMarkdown() {
    const title = (document.querySelector('h1')?.innerText || document.title || 'Extracted Document').trim();
    const url = window.location.href;

    const contentSelectors = [
      'article',
      'main',
      '.article_content',
      '.entry-content',
      '.post-content',
      '#article-content',
      '.reader-container',
      '.document-content',
      '.markdown-body'
    ];

    let rootEl = null;
    for (const sel of contentSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.length > 200) {
        rootEl = el;
        break;
      }
    }
    if (!rootEl) rootEl = document.body;

    const lines = [];
    lines.push(`# ${title}\n`);
    lines.push(`> Source URL: ${url}\n`);
    lines.push(`---\n`);

    const elements = rootEl.querySelectorAll('h1, h2, h3, h4, p, pre, ul, ol');
    if (elements.length > 0) {
      elements.forEach((el) => {
        const tag = el.tagName.toLowerCase();
        const text = el.innerText.trim();
        if (!text) return;

        if (tag === 'h1') lines.push(`\n# ${text}\n`);
        else if (tag === 'h2') lines.push(`\n## ${text}\n`);
        else if (tag === 'h3') lines.push(`\n### ${text}\n`);
        else if (tag === 'h4') lines.push(`\n#### ${text}\n`);
        else if (tag === 'pre') lines.push(`\n\`\`\`\n${text}\n\`\`\`\n`);
        else if (tag === 'p') lines.push(`\n${text}\n`);
        else if (tag === 'ul' || tag === 'ol') lines.push(`\n${text}\n`);
      });
    } else {
      lines.push(rootEl.innerText);
    }

    const markdownText = lines.join('\n');
    return {
      title,
      url,
      characterCount: markdownText.length,
      markdown: markdownText
    };
  }

  /**
   * Utilities
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

  function copyTextToClipboard(text) {
    if (!text) return false;

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

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    return true;
  }

  function showCopyNotification(msg) {
    const existing = document.querySelector('.easycopy-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'easycopy-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('easycopy-toast-fadeout');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 1800);
  }
})();
