(function initV2Content() {
  if (window.__bieJiuJieJieLaLoaded) {
    return;
  }
  window.__bieJiuJieJieLaLoaded = true;

  const utils = DecisionStopperUtils;
  const state = {
    settings: utils.clone(DEFAULT_SETTINGS),
    pageType: utils.classifyPage(location.href),
    pageKey: utils.getPageKey(location.href),
    activeSince: document.visibilityState === "visible" ? Date.now() : 0,
    activeMs: 0,
    totalScrolls: 0,
    directionChanges: 0,
    revisitCount: 0,
    lastScrollTop: window.scrollY || 0,
    lastDirection: 0,
    promptCount: 0,
    promptVisible: false,
    forceModalVisible: false,
    localCooldownUntil: getStoredCooldownUntil(),
    snoozeUntil: 0,
    recentMessages: [],
    recentForceMessages: [],
    heartbeatTimer: null,
    syncTimer: null,
    timerSession: null,
    timerStatusEl: null
  };

  const root = document.createElement("div");
  root.id = "decision-stopper-root";
  document.documentElement.appendChild(root);

  function getStoredCooldownUntil() {
    try {
      return Number(sessionStorage.getItem(`biejiujiejiela:cooldown:${location.href}`)) || 0;
    } catch (error) {
      return 0;
    }
  }

  function persistCooldownUntil(value) {
    try {
      sessionStorage.setItem(`biejiujiejiela:cooldown:${location.href}`, String(value || 0));
    } catch (error) {
      // 某些页面可能限制 sessionStorage，忽略即可
    }
  }

  async function bootstrap() {
    try {
      const response = await utils.sendMessage({
        type: MESSAGE_TYPES.GET_BOOTSTRAP,
        url: location.href,
        pageType: state.pageType
      });

      state.settings = utils.mergeSettings(DEFAULT_SETTINGS, response && response.settings);
      state.snoozeUntil = response && response.snoozeUntil ? response.snoozeUntil : 0;
      state.timerSession = utils.normalizeTimerSession(response && response.timerSession);

      if (!state.settings.enabled || !state.settings.pageTypeEnabled[state.pageType]) {
        startPassiveTimerPolling();
        return;
      }

      bindEvents();
      startHeartbeat();
      startPassiveTimerPolling();
      renderTimerChip();
    } catch (error) {
      console.warn("别在纠结啦启动失败：", error);
    }
  }

  function bindEvents() {
    document.addEventListener("visibilitychange", onVisibilityChange, true);
    window.addEventListener("beforeunload", onBeforeUnload, true);
    window.addEventListener("scroll", utils.throttle(onScroll, 220), { passive: true });
  }

  function onBeforeUnload() {
    flushActiveTime();
    flushTimerVisibleTime();
    syncTimerSession();
  }

  function flushActiveTime() {
    if (state.activeSince) {
      state.activeMs += Date.now() - state.activeSince;
      state.activeSince = 0;
    }
  }

  function resumeActiveTime() {
    if (!state.activeSince) {
      state.activeSince = Date.now();
    }
  }

  function flushTimerVisibleTime() {
    if (state.timerSession && state.timerSession.status === "running" && state.timerSession.lastVisibleAt) {
      state.timerSession.accumulatedVisibleMs += Math.max(0, Date.now() - state.timerSession.lastVisibleAt);
      state.timerSession.lastVisibleAt = 0;
    }
  }

  function resumeTimerVisibleTime() {
    if (state.timerSession && state.timerSession.status === "running" && !state.timerSession.lastVisibleAt) {
      state.timerSession.lastVisibleAt = Date.now();
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      flushActiveTime();
      flushTimerVisibleTime();
      syncTimerSession();
      updateTimerChip();
      return;
    }

    state.revisitCount += 1;
    resumeActiveTime();
    resumeTimerVisibleTime();
    evaluateTrigger();
    evaluateForceModal();
    updateTimerChip();
  }

  function onScroll() {
    const currentScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const delta = currentScrollTop - state.lastScrollTop;
    const direction = delta === 0 ? 0 : delta > 0 ? 1 : -1;

    if (Math.abs(delta) > 6) {
      state.totalScrolls += 1;
    }

    if (direction && state.lastDirection && direction !== state.lastDirection) {
      state.directionChanges += 1;
    }

    if (direction) {
      state.lastDirection = direction;
    }

    state.lastScrollTop = currentScrollTop;
    evaluateTrigger();
  }

  function startHeartbeat() {
    state.heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        evaluateTrigger();
        evaluateForceModal();
        updateTimerChip();
      }
    }, 5000);
  }

  function startPassiveTimerPolling() {
    state.syncTimer = window.setInterval(async () => {
      await refreshTimerStatus();
      if (document.visibilityState === "visible") {
        evaluateForceModal();
      }
      updateTimerChip();
    }, 4000);
  }

  function getActiveSeconds() {
    const currentMs = state.activeSince ? Date.now() - state.activeSince : 0;
    return Math.floor((state.activeMs + currentMs) / 1000);
  }

  function canTrigger() {
    const now = Date.now();
    if (!state.settings.enabled || !state.settings.pageTypeEnabled[state.pageType]) {
      return false;
    }
    if (state.promptVisible || state.forceModalVisible || state.promptCount >= state.settings.maxPromptsPerPageLoad) {
      return false;
    }
    if (now < state.localCooldownUntil || now < state.snoozeUntil) {
      return false;
    }
    return true;
  }

  function shouldTrigger() {
    const activeSeconds = getActiveSeconds();
    const thresholds = state.settings.thresholds;

    return (
      (activeSeconds >= thresholds.longStaySeconds && state.totalScrolls >= thresholds.longStayScrollCount) ||
      (activeSeconds >= thresholds.mediumStaySeconds && state.directionChanges >= thresholds.directionChangeCount) ||
      (state.revisitCount >= thresholds.revisitForegroundCount && activeSeconds >= thresholds.revisitStaySeconds)
    );
  }

  async function evaluateTrigger() {
    if (!canTrigger() || !shouldTrigger()) {
      return;
    }

    state.promptCount += 1;
    state.localCooldownUntil = Date.now() + state.settings.cooldownSeconds * 1000;
    persistCooldownUntil(state.localCooldownUntil);
    showCard();

    try {
      await utils.sendMessage({ type: MESSAGE_TYPES.RECORD_TRIGGER });
    } catch (error) {
      console.warn("记录普通提醒失败：", error);
    }
  }

  async function refreshTimerStatus() {
    try {
      const response = await utils.sendMessage({ type: MESSAGE_TYPES.GET_TIMER_STATUS });
      const incoming = utils.normalizeTimerSession(response && response.session);
      if (!incoming) {
        state.timerSession = null;
        hideForceModal();
        return;
      }

      if (state.timerSession && incoming.targetAt === state.timerSession.targetAt) {
        incoming.accumulatedVisibleMs = Math.max(incoming.accumulatedVisibleMs, state.timerSession.accumulatedVisibleMs);
        if (document.visibilityState === "visible" && state.timerSession.lastVisibleAt) {
          incoming.lastVisibleAt = state.timerSession.lastVisibleAt;
        }
      }

      state.timerSession = incoming;
      if (document.visibilityState === "visible" && state.timerSession.status === "running" && !state.timerSession.lastVisibleAt) {
        state.timerSession.lastVisibleAt = Date.now();
      }
    } catch (error) {
      // 后台不可用时不打断页面
    }
  }

  async function syncTimerSession() {
    if (!state.timerSession) {
      return;
    }

    try {
      const response = await utils.sendMessage({
        type: MESSAGE_TYPES.SYNC_TIMER_SESSION,
        session: {
          accumulatedVisibleMs: state.timerSession.accumulatedVisibleMs,
          lastVisibleAt: state.timerSession.lastVisibleAt,
          modalCooldownUntil: state.timerSession.modalCooldownUntil,
          modalShownCount: state.timerSession.modalShownCount,
          firedAt: state.timerSession.firedAt,
          status: state.timerSession.status
        }
      });
      state.timerSession = utils.normalizeTimerSession(response && response.session) || state.timerSession;
    } catch (error) {
      // 忽略偶发同步失败
    }
  }

  function canShowForceModal() {
    if (!state.timerSession || !state.settings.timerEnabled || !state.settings.timerForceModalEnabled) {
      return false;
    }
    if (state.forceModalVisible) {
      return false;
    }
    if (state.timerSession.pageKey !== state.pageKey) {
      return false;
    }
    if (!state.timerSession.forceModalEnabled || state.timerSession.status !== "running") {
      return false;
    }
    if (state.timerSession.modalShownCount >= state.settings.timerMaxModalCountPerLoad) {
      return false;
    }
    if (Date.now() < state.timerSession.modalCooldownUntil) {
      return false;
    }
    return utils.getTimerRemainingMs(state.timerSession, document.visibilityState === "visible") <= 0;
  }

  async function evaluateForceModal() {
    if (!canShowForceModal()) {
      return;
    }

    dismissCard();
    state.timerSession.modalShownCount += 1;
    state.timerSession.firedAt = Date.now();
    state.timerSession.status = "fired";
    await syncTimerSession();

    try {
      await utils.sendMessage({
        type: MESSAGE_TYPES.RECORD_TIMER_EVENT,
        eventName: "fired"
      });
    } catch (error) {
      console.warn("记录计时提醒失败：", error);
    }

    showForceModal();
  }

  function showToast(text) {
    let toast = root.querySelector(".ds-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "ds-toast";
      root.appendChild(toast);
    }

    toast.textContent = text;
    toast.classList.remove("ds-hidden");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.add("ds-hidden");
    }, 1800);
  }

  function renderTimerChip() {
    if (state.timerStatusEl) {
      return;
    }
    const chip = document.createElement("div");
    chip.className = "ds-timer-chip ds-hidden";
    root.appendChild(chip);
    state.timerStatusEl = chip;
    updateTimerChip();
  }

  function updateTimerChip() {
    if (!state.timerStatusEl) {
      return;
    }

    if (!state.timerSession || state.timerSession.pageKey !== state.pageKey || state.timerSession.status === "stopped") {
      state.timerStatusEl.classList.add("ds-hidden");
      return;
    }

    const remain = utils.formatCountdown(state.timerSession, document.visibilityState === "visible");
    state.timerStatusEl.innerHTML = `<span>⏰ 当前页计时中</span><strong>${remain}</strong>`;
    state.timerStatusEl.classList.remove("ds-hidden");
  }

  function buildCard() {
    const message = utils.pickRegularMessage(state.pageType, state.settings.toneStyle, state.recentMessages);
    state.recentMessages = [message, ...state.recentMessages].slice(0, 3);
    const minutes = Math.max(1, Math.round(getActiveSeconds() / 60));

    const card = document.createElement("div");
    card.className = "ds-card";
    card.innerHTML = `
      <div class="ds-badge">🌿 别在纠结啦</div>
      <div class="ds-title">${utils.escapeHtml(message)}</div>
      <div class="ds-meta">已停留约 ${minutes} 分钟 · 滚动 ${state.totalScrolls} 次 · 来回切换 ${state.directionChanges} 次</div>
      <div class="ds-actions">
        <button class="ds-button ds-button-primary" data-action="snooze">再看 10 分钟</button>
        <button class="ds-button ds-button-secondary" data-action="save">加入稍后再看</button>
        <button class="ds-button ds-button-muted" data-action="leave">我先离开</button>
      </div>
    `;
    card.addEventListener("click", onCardClick);
    return card;
  }

  function showCard() {
    state.promptVisible = true;
    const existing = root.querySelector(".ds-card");
    if (existing) {
      existing.remove();
    }
    root.appendChild(buildCard());
  }

  function dismissCard() {
    state.promptVisible = false;
    const card = root.querySelector(".ds-card");
    if (card) {
      card.remove();
    }
  }

  function buildForceModal() {
    const message = utils.pickForceMessage(state.pageType, state.settings.timerModalTone, state.recentForceMessages);
    state.recentForceMessages = [message, ...state.recentForceMessages].slice(0, 4);
    const remainText = state.timerSession ? utils.formatCountdown(state.timerSession, document.visibilityState === "visible") : "00:00";

    const wrap = document.createElement("div");
    wrap.className = "ds-force-wrap";
    wrap.innerHTML = `
      <div class="ds-force-backdrop"></div>
      <section class="ds-force-modal" role="dialog" aria-modal="true" aria-label="到点提醒">
        <div class="ds-force-head">
          <span class="ds-force-kicker">⏰ 到点提醒</span>
          <h2>先停一下吧</h2>
          <p>${utils.escapeHtml(message)}</p>
        </div>
        <div class="ds-force-stats">
          <div>
            <span>当前页面</span>
            <strong>${utils.escapeHtml(MICRO_COPY.pageTypeLabels[state.pageType] || "当前页面")}</strong>
          </div>
          <div>
            <span>剩余时间</span>
            <strong>${remainText}</strong>
          </div>
        </div>
        <div class="ds-force-actions">
          <button class="ds-button ds-button-primary" data-force-action="extend">再给我 5 分钟</button>
          <button class="ds-button ds-button-secondary" data-force-action="save">加入稍后再看</button>
          <button class="ds-button ds-button-muted" data-force-action="leave">我先离开</button>
          <button class="ds-button ds-button-ghost" data-force-action="dismiss">关闭提醒，继续看</button>
        </div>
      </section>
    `;
    wrap.addEventListener("click", onForceModalClick);
    return wrap;
  }

  function showForceModal() {
    hideForceModal();
    state.forceModalVisible = true;
    root.appendChild(buildForceModal());
  }

  function hideForceModal() {
    state.forceModalVisible = false;
    const modal = root.querySelector(".ds-force-wrap");
    if (modal) {
      modal.remove();
    }
  }

  async function onCardClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    switch (button.dataset.action) {
      case "snooze":
        await handleSnooze();
        return;
      case "save":
        await handleSave(false);
        return;
      case "leave":
        await handleLeave(false);
        return;
      default:
    }
  }

  async function onForceModalClick(event) {
    const button = event.target.closest("[data-force-action]");
    if (!button) {
      return;
    }

    switch (button.dataset.forceAction) {
      case "extend":
        await handleExtendTimer();
        return;
      case "save":
        await handleSave(true);
        return;
      case "leave":
        await handleLeave(true);
        return;
      case "dismiss":
        await handleDismissForceModal();
        return;
      default:
    }
  }

  async function handleSnooze() {
    try {
      const response = await utils.sendMessage({
        type: MESSAGE_TYPES.SNOOZE_PAGE,
        pageKey: state.pageKey,
        minutes: 10
      });
      state.snoozeUntil = response && response.snoozeUntil ? response.snoozeUntil : Date.now() + 10 * 60 * 1000;
      state.localCooldownUntil = state.snoozeUntil;
      persistCooldownUntil(state.localCooldownUntil);
      dismissCard();
      showToast("好，10 分钟内先不提醒你啦");
    } catch (error) {
      showToast("这次没设上，等会儿再试试");
    }
  }

  async function handleSave(fromTimer) {
    try {
      await utils.sendMessage({
        type: MESSAGE_TYPES.SAVE_FOR_LATER,
        title: document.title,
        url: location.href,
        pageType: state.pageType,
        fromTimer
      });
      dismissCard();
      hideForceModal();

      if (fromTimer) {
        await stopTimerSessionLocally();
        showToast("已放进稍后再看 📌");
      } else {
        state.localCooldownUntil = Date.now() + state.settings.cooldownSeconds * 1000;
        persistCooldownUntil(state.localCooldownUntil);
        showToast("已放进稍后再看 📌");
      }
    } catch (error) {
      showToast("保存失败了，稍后再试一次");
    }
  }

  async function handleLeave(fromTimer) {
    try {
      const response = await utils.sendMessage({
        type: MESSAGE_TYPES.ATTEMPT_LEAVE,
        fromTimer
      });

      if (response && response.ok) {
        dismissCard();
        hideForceModal();
        if (fromTimer) {
          await stopTimerSessionLocally();
        }
        if (response.mode === "blank") {
          showToast("已离开当前页");
        }
        return;
      }

      dismissCard();
      hideForceModal();
      showToast("当前浏览器没能自动关页，请手动关闭");
    } catch (error) {
      dismissCard();
      hideForceModal();
      showToast("当前浏览器没能自动关页，请手动关闭");
    }
  }

  async function handleExtendTimer() {
    try {
      const response = await utils.sendMessage({ type: MESSAGE_TYPES.EXTEND_TIMER, minutes: 5 });
      state.timerSession = utils.normalizeTimerSession(response && response.session);
      if (state.timerSession) {
        state.timerSession.status = "running";
        state.timerSession.lastVisibleAt = document.visibilityState === "visible" ? Date.now() : 0;
      }
      hideForceModal();
      updateTimerChip();
      showToast("好，再给你 5 分钟 ⏰");
    } catch (error) {
      showToast("延长失败了，稍后再试试");
    }
  }

  async function handleDismissForceModal() {
    if (!state.timerSession) {
      hideForceModal();
      return;
    }

    state.timerSession.modalCooldownUntil = Date.now() + state.settings.timerCooldownMinutes * 60 * 1000;
    state.timerSession.status = "running";
    state.timerSession.lastVisibleAt = document.visibilityState === "visible" ? Date.now() : 0;
    await syncTimerSession();
    await utils.sendMessage({
      type: MESSAGE_TYPES.RECORD_TIMER_EVENT,
      eventName: "dismissed"
    }).catch(() => {});

    hideForceModal();
    showToast(`那就再看一会儿，${state.settings.timerCooldownMinutes} 分钟后再提醒`);
  }

  async function stopTimerSessionLocally() {
    state.timerSession = null;
    updateTimerChip();
    await utils.sendMessage({ type: MESSAGE_TYPES.STOP_TIMER }).catch(() => {});
  }

  bootstrap();
})();
