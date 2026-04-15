importScripts("api.js", "pageRules.js", "constants.js", "utils.js");

async function ensureDefaults() {
  const data = await DecisionStopperUtils.getStorage([
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.STATS,
    STORAGE_KEYS.TIMER_STATS,
    STORAGE_KEYS.SAVED_LIST,
    STORAGE_KEYS.SNOOZE_MAP,
    STORAGE_KEYS.TIMER_SESSIONS
  ]);

  const next = {
    [STORAGE_KEYS.SETTINGS]: DecisionStopperUtils.mergeSettings(DEFAULT_SETTINGS, data[STORAGE_KEYS.SETTINGS]),
    [STORAGE_KEYS.STATS]: data[STORAGE_KEYS.STATS] && typeof data[STORAGE_KEYS.STATS] === "object" ? data[STORAGE_KEYS.STATS] : {},
    [STORAGE_KEYS.TIMER_STATS]:
      data[STORAGE_KEYS.TIMER_STATS] && typeof data[STORAGE_KEYS.TIMER_STATS] === "object" ? data[STORAGE_KEYS.TIMER_STATS] : {},
    [STORAGE_KEYS.SAVED_LIST]: DecisionStopperUtils.normalizeSavedList(data[STORAGE_KEYS.SAVED_LIST]),
    [STORAGE_KEYS.SNOOZE_MAP]:
      data[STORAGE_KEYS.SNOOZE_MAP] && typeof data[STORAGE_KEYS.SNOOZE_MAP] === "object" ? data[STORAGE_KEYS.SNOOZE_MAP] : {},
    [STORAGE_KEYS.TIMER_SESSIONS]:
      data[STORAGE_KEYS.TIMER_SESSIONS] && typeof data[STORAGE_KEYS.TIMER_SESSIONS] === "object"
        ? data[STORAGE_KEYS.TIMER_SESSIONS]
        : {}
  };

  await DecisionStopperUtils.setStorage(next);
}

async function getSettings() {
  const data = await DecisionStopperUtils.getStorage([STORAGE_KEYS.SETTINGS]);
  return DecisionStopperUtils.mergeSettings(DEFAULT_SETTINGS, data[STORAGE_KEYS.SETTINGS]);
}

async function updateDailyStats(storageKey, counterKey, emptyFactory) {
  const data = await DecisionStopperUtils.getStorage([storageKey]);
  const records = data[storageKey] || {};
  const todayKey = DecisionStopperUtils.getTodayKey();
  const todayStats = { ...emptyFactory(), ...(records[todayKey] || {}) };
  todayStats[counterKey] = (todayStats[counterKey] || 0) + 1;
  records[todayKey] = todayStats;
  await DecisionStopperUtils.setStorage({ [storageKey]: records });
  return todayStats;
}

async function updateStats(counterKey) {
  return updateDailyStats(STORAGE_KEYS.STATS, counterKey, DecisionStopperUtils.getEmptyStats);
}

async function updateTimerStats(counterKey) {
  return updateDailyStats(STORAGE_KEYS.TIMER_STATS, counterKey, DecisionStopperUtils.getEmptyTimerStats);
}

async function getTimerSessions() {
  const data = await DecisionStopperUtils.getStorage([STORAGE_KEYS.TIMER_SESSIONS]);
  return data[STORAGE_KEYS.TIMER_SESSIONS] || {};
}

async function saveTimerSessions(sessions) {
  await DecisionStopperUtils.setStorage({ [STORAGE_KEYS.TIMER_SESSIONS]: sessions });
}

function getSessionKey(tabId) {
  return String(tabId);
}

async function getCurrentActiveTab() {
  const tabs = await ExtApiHelper.queryTabs({ active: true, currentWindow: true });
  return Array.isArray(tabs) && tabs.length ? tabs[0] : null;
}

async function getSessionForTab(tabId) {
  if (!Number.isInteger(tabId)) {
    return null;
  }
  const sessions = await getTimerSessions();
  return DecisionStopperUtils.normalizeTimerSession(sessions[getSessionKey(tabId)]);
}

async function handleGetBootstrap(message, sender) {
  const settings = await getSettings();
  const pageKey = DecisionStopperUtils.getPageKey(message.url);
  const data = await DecisionStopperUtils.getStorage([STORAGE_KEYS.SNOOZE_MAP]);
  const snoozeMap = data[STORAGE_KEYS.SNOOZE_MAP] || {};
  const tabId = sender.tab && sender.tab.id;
  let timerSession = await getSessionForTab(tabId);

  if (!timerSession && settings.timerEnabled && settings.timerAllowPerType) {
    const pageType = message.pageType || DecisionStopperUtils.classifyPage(message.url);
    const autoTimer = settings.perTypeTimerConfig[pageType];
    if (autoTimer && autoTimer.enabled) {
      timerSession = await createTimerSession({
        tabId,
        url: message.url,
        title: sender.tab && sender.tab.title,
        pageType,
        minutes: autoTimer.minutes,
        forceModalEnabled: settings.timerForceModalEnabled,
        source: "perType"
      });
    }
  }

  return {
    settings,
    snoozeUntil: snoozeMap[pageKey] || 0,
    timerSession
  };
}

async function handleSnooze(message) {
  const pageKey = DecisionStopperUtils.getPageKey(message.pageKey || message.url);
  const data = await DecisionStopperUtils.getStorage([STORAGE_KEYS.SNOOZE_MAP]);
  const snoozeMap = data[STORAGE_KEYS.SNOOZE_MAP] || {};
  snoozeMap[pageKey] = Date.now() + (message.minutes || 10) * 60 * 1000;
  await DecisionStopperUtils.setStorage({ [STORAGE_KEYS.SNOOZE_MAP]: snoozeMap });
  await updateStats("snoozes");
  return { ok: true, snoozeUntil: snoozeMap[pageKey] };
}

async function handleSaveForLater(message) {
  const data = await DecisionStopperUtils.getStorage([STORAGE_KEYS.SAVED_LIST]);
  const savedList = DecisionStopperUtils.normalizeSavedList(data[STORAGE_KEYS.SAVED_LIST]);
  const item = {
    id: DecisionStopperUtils.uid("saved"),
    title: message.title || "未命名页面",
    url: message.url,
    pageType: message.pageType || "default",
    savedAt: Date.now()
  };

  const nextList = [item, ...savedList.filter((entry) => entry.url !== item.url)].slice(0, 300);
  await DecisionStopperUtils.setStorage({ [STORAGE_KEYS.SAVED_LIST]: nextList });
  if (message.fromTimer) {
    await updateTimerStats("saved");
  } else {
    await updateStats("saved");
  }
  return { ok: true, item };
}

async function tryLeaveTab(tabId, fromTimer) {
  if (!Number.isInteger(tabId)) {
    return { ok: false, fallback: "manual" };
  }

  async function clearTimerSessionIfNeeded() {
    const sessions = await getTimerSessions();
    const key = getSessionKey(tabId);
    if (sessions[key]) {
      delete sessions[key];
      await saveTimerSessions(sessions);
    }
  }

  try {
    await ExtApiHelper.removeTab(tabId);
    await clearTimerSessionIfNeeded();
    await (fromTimer ? updateTimerStats("left") : updateStats("left"));
    return { ok: true, mode: "closed" };
  } catch (error) {
    try {
      await ExtApiHelper.updateTab(tabId, { url: "about:blank" });
      await clearTimerSessionIfNeeded();
      await (fromTimer ? updateTimerStats("left") : updateStats("left"));
      return { ok: true, mode: "blank" };
    } catch (updateError) {
      return { ok: false, fallback: "manual" };
    }
  }
}

async function handleAttemptLeave(sender, message) {
  return tryLeaveTab(sender.tab && sender.tab.id, Boolean(message.fromTimer));
}

async function buildPopupTimerPayload() {
  const tab = await getCurrentActiveTab();
  if (!tab || !Number.isInteger(tab.id)) {
    return { session: null, tab: null };
  }

  const session = await getSessionForTab(tab.id);
  return {
    tab: {
      id: tab.id,
      title: tab.title || "当前页面",
      url: tab.url || "",
      pageType: DecisionStopperUtils.classifyPage(tab.url || "")
    },
    session
  };
}

async function handleGetPopupData() {
  const data = await DecisionStopperUtils.getStorage([
    STORAGE_KEYS.STATS,
    STORAGE_KEYS.SAVED_LIST,
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.TIMER_STATS
  ]);

  const todayKey = DecisionStopperUtils.getTodayKey();
  const todayStats = { ...DecisionStopperUtils.getEmptyStats(), ...((data[STORAGE_KEYS.STATS] || {})[todayKey] || {}) };
  const todayTimerStats = {
    ...DecisionStopperUtils.getEmptyTimerStats(),
    ...((data[STORAGE_KEYS.TIMER_STATS] || {})[todayKey] || {})
  };
  const settings = DecisionStopperUtils.mergeSettings(DEFAULT_SETTINGS, data[STORAGE_KEYS.SETTINGS]);
  const savedList = DecisionStopperUtils.normalizeSavedList(data[STORAGE_KEYS.SAVED_LIST]).slice(0, 5);
  const timer = await buildPopupTimerPayload();

  return {
    todayStats,
    todayTimerStats,
    enabled: settings.enabled,
    settings,
    savedList,
    currentTab: timer.tab,
    timerSession: timer.session
  };
}

async function handleGetHistoryData() {
  const data = await DecisionStopperUtils.getStorage([STORAGE_KEYS.SAVED_LIST]);
  return { savedList: DecisionStopperUtils.normalizeSavedList(data[STORAGE_KEYS.SAVED_LIST]) };
}

async function handleDeleteHistoryItem(message) {
  const data = await DecisionStopperUtils.getStorage([STORAGE_KEYS.SAVED_LIST]);
  const nextList = DecisionStopperUtils
    .normalizeSavedList(data[STORAGE_KEYS.SAVED_LIST])
    .filter((item) => item.id !== message.id);
  await DecisionStopperUtils.setStorage({ [STORAGE_KEYS.SAVED_LIST]: nextList });
  return { ok: true, savedList: nextList };
}

async function handleClearHistory() {
  await DecisionStopperUtils.setStorage({ [STORAGE_KEYS.SAVED_LIST]: [] });
  return { ok: true, savedList: [] };
}

async function handleGetSettings() {
  return { settings: await getSettings() };
}

async function handleSaveSettings(message) {
  const settings = DecisionStopperUtils.mergeSettings(DEFAULT_SETTINGS, message.settings);
  await DecisionStopperUtils.setStorage({ [STORAGE_KEYS.SETTINGS]: settings });
  return { ok: true, settings };
}

async function createTimerSession({ tabId, url, title, pageType, minutes, forceModalEnabled, source }) {
  if (!Number.isInteger(tabId)) {
    throw new Error("无法识别当前标签页");
  }

  const now = Date.now();
  const session = {
    tabId,
    url,
    title: title || "当前页面",
    pageKey: DecisionStopperUtils.getPageKey(url || ""),
    pageType: pageType || DecisionStopperUtils.classifyPage(url || ""),
    startedAt: now,
    targetAt: now + Number(minutes || DEFAULT_SETTINGS.timerDefaultMinutes) * 60 * 1000,
    lastVisibleAt: now,
    accumulatedVisibleMs: 0,
    enabled: true,
    source: source || "manual",
    forceModalEnabled: forceModalEnabled !== false,
    modalCooldownUntil: 0,
    modalShownCount: 0,
    firedAt: 0,
    status: "running"
  };

  const sessions = await getTimerSessions();
  sessions[getSessionKey(tabId)] = session;
  await saveTimerSessions(sessions);
  await updateTimerStats("started");
  return DecisionStopperUtils.normalizeTimerSession(session);
}

async function handleStartTimer(message) {
  const tab = message.tabId ? { id: message.tabId, url: message.url, title: message.title } : await getCurrentActiveTab();
  if (!tab || !Number.isInteger(tab.id)) {
    return { ok: false, error: "NO_ACTIVE_TAB" };
  }

  const settings = await getSettings();
  const pageType = message.pageType || DecisionStopperUtils.classifyPage(tab.url || message.url || "");
  const session = await createTimerSession({
    tabId: tab.id,
    url: tab.url || message.url || "",
    title: tab.title || message.title || "当前页面",
    pageType,
    minutes: message.minutes || settings.timerDefaultMinutes,
    forceModalEnabled: settings.timerForceModalEnabled,
    source: message.source || "manual"
  });

  return { ok: true, session };
}

async function handleStopTimer(message) {
  const tabId = message.tabId || ((await getCurrentActiveTab()) || {}).id;
  if (!Number.isInteger(tabId)) {
    return { ok: true };
  }

  const sessions = await getTimerSessions();
  delete sessions[getSessionKey(tabId)];
  await saveTimerSessions(sessions);
  return { ok: true };
}

async function handleGetTimerStatus(message) {
  const tabId = message.tabId || ((await getCurrentActiveTab()) || {}).id;
  return {
    session: await getSessionForTab(tabId)
  };
}

async function handleExtendTimer(message) {
  const tabId = message.tabId || ((await getCurrentActiveTab()) || {}).id;
  if (!Number.isInteger(tabId)) {
    return { ok: false, error: "NO_ACTIVE_TAB" };
  }

  const sessions = await getTimerSessions();
  const key = getSessionKey(tabId);
  const session = DecisionStopperUtils.normalizeTimerSession(sessions[key]);
  if (!session) {
    return { ok: false, error: "NO_SESSION" };
  }

  session.targetAt += Number(message.minutes || 5) * 60 * 1000;
  session.modalCooldownUntil = Date.now() + 60 * 1000;
  session.status = "running";
  sessions[key] = session;
  await saveTimerSessions(sessions);
  await updateTimerStats("extended");
  return { ok: true, session };
}

async function handleSyncTimerSession(message, sender) {
  const tabId = sender.tab && sender.tab.id;
  if (!Number.isInteger(tabId)) {
    return { ok: false, error: "NO_TAB" };
  }

  const sessions = await getTimerSessions();
  const key = getSessionKey(tabId);
  const current = DecisionStopperUtils.normalizeTimerSession(sessions[key]);
  if (!current) {
    return { ok: false, error: "NO_SESSION" };
  }

  const merged = {
    ...current,
    ...message.session,
    tabId,
    title: sender.tab.title || current.title,
    url: sender.tab.url || current.url,
    pageKey: DecisionStopperUtils.getPageKey(sender.tab.url || current.url),
    pageType: current.pageType
  };
  sessions[key] = merged;
  await saveTimerSessions(sessions);
  return { ok: true, session: DecisionStopperUtils.normalizeTimerSession(merged) };
}

async function handleRecordTimerEvent(message, sender) {
  if (message.eventName) {
    await updateTimerStats(message.eventName);
  }

  if (message.stopSession) {
    return handleStopTimer({ tabId: sender.tab && sender.tab.id });
  }

  return { ok: true };
}

function attachLifecycleListeners() {
  const runtimeApi = extApi.runtime;
  runtimeApi.onInstalled.addListener(() => {
    ensureDefaults();
  });
  runtimeApi.onStartup.addListener(() => {
    ensureDefaults();
  });

  if (extApi.tabs && extApi.tabs.onRemoved) {
    extApi.tabs.onRemoved.addListener(async (tabId) => {
      const sessions = await getTimerSessions();
      const key = getSessionKey(tabId);
      if (sessions[key]) {
        delete sessions[key];
        await saveTimerSessions(sessions);
      }
    });
  }
}

attachLifecycleListeners();

extApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    await ensureDefaults();

    switch (message.type) {
      case MESSAGE_TYPES.GET_BOOTSTRAP:
        sendResponse(await handleGetBootstrap(message, sender));
        return;
      case MESSAGE_TYPES.RECORD_TRIGGER:
        sendResponse({ ok: true, todayStats: await updateStats("triggers") });
        return;
      case MESSAGE_TYPES.SNOOZE_PAGE:
        sendResponse(await handleSnooze(message));
        return;
      case MESSAGE_TYPES.SAVE_FOR_LATER:
        sendResponse(await handleSaveForLater(message));
        return;
      case MESSAGE_TYPES.ATTEMPT_LEAVE:
        sendResponse(await handleAttemptLeave(sender, message));
        return;
      case MESSAGE_TYPES.GET_POPUP_DATA:
        sendResponse(await handleGetPopupData());
        return;
      case MESSAGE_TYPES.GET_HISTORY_DATA:
        sendResponse(await handleGetHistoryData());
        return;
      case MESSAGE_TYPES.DELETE_HISTORY_ITEM:
        sendResponse(await handleDeleteHistoryItem(message));
        return;
      case MESSAGE_TYPES.CLEAR_HISTORY:
        sendResponse(await handleClearHistory());
        return;
      case MESSAGE_TYPES.GET_SETTINGS:
        sendResponse(await handleGetSettings());
        return;
      case MESSAGE_TYPES.SAVE_SETTINGS:
        sendResponse(await handleSaveSettings(message));
        return;
      case MESSAGE_TYPES.START_TIMER:
        sendResponse(await handleStartTimer(message));
        return;
      case MESSAGE_TYPES.STOP_TIMER:
        sendResponse(await handleStopTimer(message));
        return;
      case MESSAGE_TYPES.GET_TIMER_STATUS:
        sendResponse(await handleGetTimerStatus(message));
        return;
      case MESSAGE_TYPES.EXTEND_TIMER:
        sendResponse(await handleExtendTimer(message));
        return;
      case MESSAGE_TYPES.RECORD_TIMER_EVENT:
        sendResponse(await handleRecordTimerEvent(message, sender));
        return;
      case MESSAGE_TYPES.SYNC_TIMER_SESSION:
        sendResponse(await handleSyncTimerSession(message, sender));
        return;
      default:
        sendResponse({ ok: false, error: "UNKNOWN_MESSAGE" });
    }
  })().catch((error) => {
    sendResponse({ ok: false, error: error && error.message ? error.message : "UNKNOWN_ERROR" });
  });

  return true;
});
