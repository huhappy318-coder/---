const DecisionStopperUtils = (() => {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizePerTypeConfig(incoming) {
    const merged = clone(DEFAULT_SETTINGS.perTypeTimerConfig);
    const source = incoming || {};
    PAGE_TYPES.forEach((type) => {
      const current = source[type] || {};
      merged[type] = {
        enabled: typeof current.enabled === "boolean" ? current.enabled : merged[type].enabled,
        minutes: Number(current.minutes) > 0 ? Number(current.minutes) : merged[type].minutes
      };
    });
    return merged;
  }

  function mergeSettings(base, incoming) {
    const merged = clone(base || DEFAULT_SETTINGS);
    const next = incoming || {};

    merged.enabled = typeof next.enabled === "boolean" ? next.enabled : merged.enabled;
    merged.cooldownSeconds = Number(next.cooldownSeconds) > 0 ? Number(next.cooldownSeconds) : merged.cooldownSeconds;
    merged.maxPromptsPerPageLoad =
      Number(next.maxPromptsPerPageLoad) > 0 ? Number(next.maxPromptsPerPageLoad) : merged.maxPromptsPerPageLoad;
    merged.toneStyle = TONE_STYLES.includes(next.toneStyle) ? next.toneStyle : merged.toneStyle;
    merged.timerEnabled = typeof next.timerEnabled === "boolean" ? next.timerEnabled : merged.timerEnabled;
    merged.timerDefaultMinutes =
      Number(next.timerDefaultMinutes) > 0 ? Number(next.timerDefaultMinutes) : merged.timerDefaultMinutes;
    merged.timerCurrentTabOnly =
      typeof next.timerCurrentTabOnly === "boolean" ? next.timerCurrentTabOnly : merged.timerCurrentTabOnly;
    merged.timerAllowPerType =
      typeof next.timerAllowPerType === "boolean" ? next.timerAllowPerType : merged.timerAllowPerType;
    merged.timerForceModalEnabled =
      typeof next.timerForceModalEnabled === "boolean"
        ? next.timerForceModalEnabled
        : merged.timerForceModalEnabled;
    merged.timerCooldownMinutes =
      Number(next.timerCooldownMinutes) > 0 ? Number(next.timerCooldownMinutes) : merged.timerCooldownMinutes;
    merged.timerMaxModalCountPerLoad =
      Number(next.timerMaxModalCountPerLoad) > 0
        ? Number(next.timerMaxModalCountPerLoad)
        : merged.timerMaxModalCountPerLoad;
    merged.timerModalTone = TONE_STYLES.includes(next.timerModalTone) ? next.timerModalTone : merged.timerModalTone;

    merged.pageTypeEnabled = { ...merged.pageTypeEnabled, ...(next.pageTypeEnabled || {}) };
    merged.thresholds = { ...merged.thresholds, ...(next.thresholds || {}) };
    merged.perTypeTimerConfig = normalizePerTypeConfig(next.perTypeTimerConfig);

    return merged;
  }

  function classifyPage(urlString) {
    return PageClassifier.classify(urlString);
  }

  function getPageKey(urlString) {
    try {
      const url = new URL(urlString);
      url.hash = "";
      return `${url.origin}${url.pathname}${url.search}`;
    } catch (error) {
      return urlString || "";
    }
  }

  function pickMessage(poolMap, pageType, tone, recentMessages) {
    const toneKey = poolMap[tone] ? tone : DEFAULT_SETTINGS.toneStyle;
    const pageKey = poolMap[toneKey][pageType] ? pageType : "default";
    const pool = poolMap[toneKey][pageKey];
    const recent = Array.isArray(recentMessages) ? recentMessages : [];
    const filtered = pool.filter((item) => !recent.includes(item));
    const candidates = filtered.length ? filtered : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function pickRegularMessage(pageType, tone, recentMessages) {
    return pickMessage(COPY_LIBRARY, pageType, tone, recentMessages);
  }

  function pickForceMessage(pageType, tone, recentMessages) {
    return pickMessage(FORCE_MODAL_COPY, pageType, tone, recentMessages);
  }

  function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
  }

  function formatDateTime(timestamp) {
    if (!timestamp) {
      return "";
    }
    try {
      return new Date(timestamp).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return "";
    }
  }

  function formatRelativeDateTime(timestamp) {
    if (!timestamp) {
      return "";
    }

    const target = new Date(timestamp);
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const diffDays = Math.floor((startToday - startTarget) / (24 * 60 * 60 * 1000));
    const timePart = target.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    if (diffDays === 0) {
      return `今天 ${timePart}`;
    }
    if (diffDays === 1) {
      return `昨天 ${timePart}`;
    }
    return `${target.getFullYear()}/${`${target.getMonth() + 1}`.padStart(2, "0")}/${`${target.getDate()}`.padStart(2, "0")} ${timePart}`;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function throttle(fn, wait) {
    let last = 0;
    let timeoutId = null;
    let pendingArgs = null;

    return function throttled(...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      pendingArgs = args;

      if (remaining <= 0) {
        clearTimeout(timeoutId);
        timeoutId = null;
        last = now;
        fn.apply(this, pendingArgs);
        pendingArgs = null;
        return;
      }

      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          last = Date.now();
          timeoutId = null;
          fn.apply(this, pendingArgs);
          pendingArgs = null;
        }, remaining);
      }
    };
  }

  function getStorage(keys) {
    return ExtApiHelper.storageGet(keys);
  }

  function setStorage(items) {
    return ExtApiHelper.storageSet(items);
  }

  function removeStorage(keys) {
    return ExtApiHelper.storageRemove(keys);
  }

  function sendMessage(message) {
    return ExtApiHelper.sendMessage(message);
  }

  function normalizeSavedList(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter((item) => item && item.id && item.url).sort((a, b) => b.savedAt - a.savedAt);
  }

  function getEmptyStats() {
    return { triggers: 0, snoozes: 0, saved: 0, left: 0 };
  }

  function getEmptyTimerStats() {
    return { started: 0, fired: 0, extended: 0, dismissed: 0, saved: 0, left: 0 };
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDuration(remainMs) {
    const safeMs = Math.max(0, Number(remainMs || 0));
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = `${Math.floor(totalSeconds / 60)}`.padStart(2, "0");
    const seconds = `${totalSeconds % 60}`.padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function getTimerRemainingMs(session, visibleNow) {
    if (!session) {
      return 0;
    }
    const totalBudget = Math.max(0, Number(session.targetAt) - Number(session.startedAt));
    const baseVisible = Math.max(0, Number(session.accumulatedVisibleMs) || 0);
    const liveVisible =
      visibleNow && Number(session.lastVisibleAt) ? Math.max(0, Date.now() - Number(session.lastVisibleAt)) : 0;
    return Math.max(0, totalBudget - baseVisible - liveVisible);
  }

  function formatCountdown(session, visibleNow) {
    const remainMs = getTimerRemainingMs(session, visibleNow);
    const totalSeconds = Math.floor(remainMs / 1000);
    const minutes = `${Math.floor(totalSeconds / 60)}`.padStart(2, "0");
    const seconds = `${totalSeconds % 60}`.padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function normalizeTimerSession(session) {
    if (!session) {
      return null;
    }
    return {
      tabId: Number.isInteger(session.tabId) ? session.tabId : null,
      url: session.url || "",
      pageKey: session.pageKey || getPageKey(session.url || ""),
      pageType: PAGE_TYPES.includes(session.pageType) ? session.pageType : "default",
      title: session.title || "",
      startedAt: Number(session.startedAt) || Date.now(),
      targetAt: Number(session.targetAt) || 0,
      lastVisibleAt: Number(session.lastVisibleAt) || Date.now(),
      accumulatedVisibleMs: Number(session.accumulatedVisibleMs) || 0,
      enabled: session.enabled !== false,
      source: session.source || "manual",
      forceModalEnabled: session.forceModalEnabled !== false,
      modalCooldownUntil: Number(session.modalCooldownUntil) || 0,
      modalShownCount: Number(session.modalShownCount) || 0,
      firedAt: Number(session.firedAt) || 0,
      status: session.status || "running"
    };
  }

  return {
    clone,
    mergeSettings,
    classifyPage,
    getPageKey,
    pickRegularMessage,
    pickForceMessage,
    getTodayKey,
    formatDateTime,
    formatRelativeDateTime,
    uid,
    debounce,
    throttle,
    getStorage,
    setStorage,
    removeStorage,
    sendMessage,
    normalizeSavedList,
    getEmptyStats,
    getEmptyTimerStats,
    escapeHtml,
    formatDuration,
    getTimerRemainingMs,
    formatCountdown,
    normalizeTimerSession
  };
})();
