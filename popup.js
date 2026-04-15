(function initPopupV2() {
  const utils = DecisionStopperUtils;
  const els = {
    statusPill: document.getElementById("statusPill"),
    tinySummary: document.getElementById("tinySummary"),
    triggersValue: document.getElementById("triggersValue"),
    leftValue: document.getElementById("leftValue"),
    savedValue: document.getElementById("savedValue"),
    timerFiredValue: document.getElementById("timerFiredValue"),
    currentTabInfo: document.getElementById("currentTabInfo"),
    timerStatus: document.getElementById("timerStatus"),
    savedList: document.getElementById("savedList"),
    customMinutesInput: document.getElementById("customMinutesInput"),
    startCustomTimerButton: document.getElementById("startCustomTimerButton"),
    stopTimerButton: document.getElementById("stopTimerButton"),
    refreshButton: document.getElementById("refreshButton")
  };

  let currentPayload = null;
  let countdownTimer = null;

  function renderCurrentTab(tab) {
    if (!tab) {
      els.currentTabInfo.innerHTML = `
        <strong>当前页面暂不可读取</strong>
        <p>可以先切到普通网页，再回来开启计时提醒。</p>
      `;
      return;
    }

    const typeLabel = MICRO_COPY.pageTypeLabels[tab.pageType] || "当前页面";
    els.currentTabInfo.innerHTML = `
      <strong>${utils.escapeHtml(tab.title || "当前页面")}</strong>
      <p>${typeLabel} · ${utils.escapeHtml(tab.url || "")}</p>
    `;
  }

  function renderTimerStatus(session) {
    if (!session) {
      els.timerStatus.innerHTML = `
        <strong>还没有开始计时</strong>
        <p>选一个快捷时间，或者输入分钟数后开始。</p>
      `;
      return;
    }

    const remainText = utils.formatCountdown(session, true);
    const modalLabel = session.forceModalEnabled ? "到点强提醒已开启" : "到点强提醒已关闭";
    els.timerStatus.innerHTML = `
      <strong>${session.source === "perType" ? "当前页面按分类自动计时中" : "当前页面计时中"}</strong>
      <p><span class="timer-status-live">还剩 ${remainText}</span></p>
      <p>${modalLabel} · 已提醒 ${session.modalShownCount || 0} 次</p>
    `;
  }

  function renderSavedList(list) {
    if (!list.length) {
      els.savedList.innerHTML = `
        <div class="empty-card">
          <span class="emoji">📌</span>
          <p>这里还空着。下次点一下“加入稍后再看”，就会出现在这里。</p>
        </div>
      `;
      return;
    }

    els.savedList.innerHTML = list
      .map((item) => `
        <article class="saved-item">
          <strong>${utils.escapeHtml(item.title)}</strong>
          <p>${MICRO_COPY.pageTypeLabels[item.pageType] || item.pageType} · ${utils.formatRelativeDateTime(item.savedAt)}</p>
        </article>
      `)
      .join("");
  }

  function updateSummary(payload) {
    els.statusPill.textContent = payload.enabled ? "已开启" : "已暂停";
    els.tinySummary.textContent = payload.timerSession
      ? `当前页面计时中 · ${utils.formatCountdown(payload.timerSession, true)}`
      : `今日已提醒 ${payload.todayStats.triggers || 0} 次`;
  }

  async function loadData() {
    try {
      const payload = await utils.sendMessage({ type: MESSAGE_TYPES.GET_POPUP_DATA });
      currentPayload = payload;
      els.triggersValue.textContent = payload.todayStats.triggers || 0;
      els.leftValue.textContent = payload.todayStats.left || 0;
      els.savedValue.textContent = payload.todayStats.saved || 0;
      els.timerFiredValue.textContent = payload.todayTimerStats.fired || 0;
      renderCurrentTab(payload.currentTab);
      renderTimerStatus(payload.timerSession);
      renderSavedList(payload.savedList || []);
      updateSummary(payload);
      startCountdownTick();
    } catch (error) {
      els.currentTabInfo.innerHTML = "<strong>数据没加载出来</strong><p>稍后再打开一次看看。</p>";
    }
  }

  function startCountdownTick() {
    window.clearInterval(countdownTimer);
    countdownTimer = window.setInterval(() => {
      if (!currentPayload || !currentPayload.timerSession) {
        return;
      }
      renderTimerStatus(currentPayload.timerSession);
      updateSummary(currentPayload);
    }, 1000);
  }

  async function startTimer(minutes) {
    try {
      const response = await utils.sendMessage({
        type: MESSAGE_TYPES.START_TIMER,
        minutes,
        source: "manual"
      });
      currentPayload = currentPayload || {};
      currentPayload.timerSession = response.session || null;
      renderTimerStatus(currentPayload.timerSession);
      updateSummary({
        ...currentPayload,
        todayStats: currentPayload.todayStats || utils.getEmptyStats(),
        enabled: currentPayload.enabled !== false
      });
      startCountdownTick();
    } catch (error) {
      els.timerStatus.innerHTML = "<strong>计时启动失败</strong><p>当前页面可能不支持，请换到普通网页再试。</p>";
    }
  }

  async function stopTimer() {
    try {
      await utils.sendMessage({ type: MESSAGE_TYPES.STOP_TIMER });
      if (currentPayload) {
        currentPayload.timerSession = null;
      }
      renderTimerStatus(null);
      updateSummary({
        ...(currentPayload || {}),
        todayStats: (currentPayload && currentPayload.todayStats) || utils.getEmptyStats(),
        enabled: currentPayload ? currentPayload.enabled : true,
        timerSession: null
      });
    } catch (error) {
      els.timerStatus.innerHTML = "<strong>停止失败</strong><p>你可以刷新一下再试。</p>";
    }
  }

  function openPage(path) {
    ExtApiHelper.createTab({ url: extApi.runtime.getURL(path) });
  }

  document.querySelectorAll(".chip-button").forEach((button) => {
    button.addEventListener("click", () => startTimer(Number(button.dataset.minutes)));
  });

  els.startCustomTimerButton.addEventListener("click", () => {
    const minutes = Number(els.customMinutesInput.value) || 0;
    if (minutes <= 0) {
      els.timerStatus.innerHTML = "<strong>填个分钟数吧</strong><p>比如 8、12、25 都可以。</p>";
      return;
    }
    startTimer(minutes);
  });

  els.stopTimerButton.addEventListener("click", stopTimer);
  els.refreshButton.addEventListener("click", loadData);
  document.getElementById("openOptionsButton").addEventListener("click", () => openPage("options.html"));
  document.getElementById("openHistoryButton").addEventListener("click", () => openPage("history.html"));

  loadData();
})();
