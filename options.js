(function initOptionsV2() {
  const utils = DecisionStopperUtils;
  const form = document.getElementById("settingsForm");
  const statusText = document.getElementById("statusText");

  const fields = {
    enabled: document.getElementById("enabled"),
    pageShopping: document.getElementById("page-shopping"),
    pageVideo: document.getElementById("page-video"),
    pageSocial: document.getElementById("page-social"),
    pageArticle: document.getElementById("page-article"),
    pageWorkStudy: document.getElementById("page-workStudy"),
    pageDefault: document.getElementById("page-default"),
    longStaySeconds: document.getElementById("longStaySeconds"),
    longStayScrollCount: document.getElementById("longStayScrollCount"),
    mediumStaySeconds: document.getElementById("mediumStaySeconds"),
    directionChangeCount: document.getElementById("directionChangeCount"),
    revisitForegroundCount: document.getElementById("revisitForegroundCount"),
    revisitStaySeconds: document.getElementById("revisitStaySeconds"),
    cooldownSeconds: document.getElementById("cooldownSeconds"),
    maxPromptsPerPageLoad: document.getElementById("maxPromptsPerPageLoad"),
    timerEnabled: document.getElementById("timerEnabled"),
    timerCurrentTabOnly: document.getElementById("timerCurrentTabOnly"),
    timerAllowPerType: document.getElementById("timerAllowPerType"),
    timerForceModalEnabled: document.getElementById("timerForceModalEnabled"),
    timerDefaultMinutes: document.getElementById("timerDefaultMinutes"),
    timerCooldownMinutes: document.getElementById("timerCooldownMinutes"),
    timerMaxModalCountPerLoad: document.getElementById("timerMaxModalCountPerLoad")
  };

  const perTypeFields = {
    shopping: { enabled: document.getElementById("timer-shopping-enabled"), minutes: document.getElementById("timer-shopping-minutes") },
    video: { enabled: document.getElementById("timer-video-enabled"), minutes: document.getElementById("timer-video-minutes") },
    social: { enabled: document.getElementById("timer-social-enabled"), minutes: document.getElementById("timer-social-minutes") },
    article: { enabled: document.getElementById("timer-article-enabled"), minutes: document.getElementById("timer-article-minutes") },
    workStudy: { enabled: document.getElementById("timer-workStudy-enabled"), minutes: document.getElementById("timer-workStudy-minutes") },
    default: { enabled: document.getElementById("timer-default-enabled"), minutes: document.getElementById("timer-default-minutes") }
  };

  function showStatus(text) {
    statusText.textContent = text;
    window.clearTimeout(showStatus.timer);
    showStatus.timer = window.setTimeout(() => {
      statusText.textContent = "";
    }, 2200);
  }

  function fillForm(settings) {
    fields.enabled.checked = settings.enabled;
    fields.pageShopping.checked = settings.pageTypeEnabled.shopping;
    fields.pageVideo.checked = settings.pageTypeEnabled.video;
    fields.pageSocial.checked = settings.pageTypeEnabled.social;
    fields.pageArticle.checked = settings.pageTypeEnabled.article;
    fields.pageWorkStudy.checked = settings.pageTypeEnabled.workStudy;
    fields.pageDefault.checked = settings.pageTypeEnabled.default;
    fields.longStaySeconds.value = settings.thresholds.longStaySeconds;
    fields.longStayScrollCount.value = settings.thresholds.longStayScrollCount;
    fields.mediumStaySeconds.value = settings.thresholds.mediumStaySeconds;
    fields.directionChangeCount.value = settings.thresholds.directionChangeCount;
    fields.revisitForegroundCount.value = settings.thresholds.revisitForegroundCount;
    fields.revisitStaySeconds.value = settings.thresholds.revisitStaySeconds;
    fields.cooldownSeconds.value = settings.cooldownSeconds;
    fields.maxPromptsPerPageLoad.value = settings.maxPromptsPerPageLoad;
    fields.timerEnabled.checked = settings.timerEnabled;
    fields.timerCurrentTabOnly.checked = settings.timerCurrentTabOnly;
    fields.timerAllowPerType.checked = settings.timerAllowPerType;
    fields.timerForceModalEnabled.checked = settings.timerForceModalEnabled;
    fields.timerDefaultMinutes.value = settings.timerDefaultMinutes;
    fields.timerCooldownMinutes.value = settings.timerCooldownMinutes;
    fields.timerMaxModalCountPerLoad.value = settings.timerMaxModalCountPerLoad;

    const toneInput = form.querySelector(`input[name="toneStyle"][value="${settings.toneStyle}"]`);
    const timerToneInput = form.querySelector(`input[name="timerModalTone"][value="${settings.timerModalTone}"]`);
    if (toneInput) toneInput.checked = true;
    if (timerToneInput) timerToneInput.checked = true;

    Object.entries(perTypeFields).forEach(([type, refs]) => {
      refs.enabled.checked = settings.perTypeTimerConfig[type].enabled;
      refs.minutes.value = settings.perTypeTimerConfig[type].minutes;
    });
  }

  function readForm() {
    const toneStyle = form.querySelector('input[name="toneStyle"]:checked')?.value || DEFAULT_SETTINGS.toneStyle;
    const timerModalTone =
      form.querySelector('input[name="timerModalTone"]:checked')?.value || DEFAULT_SETTINGS.timerModalTone;

    const perTypeTimerConfig = {};
    Object.entries(perTypeFields).forEach(([type, refs]) => {
      perTypeTimerConfig[type] = {
        enabled: refs.enabled.checked,
        minutes: Number(refs.minutes.value) || DEFAULT_SETTINGS.perTypeTimerConfig[type].minutes
      };
    });

    return {
      enabled: fields.enabled.checked,
      pageTypeEnabled: {
        shopping: fields.pageShopping.checked,
        video: fields.pageVideo.checked,
        social: fields.pageSocial.checked,
        article: fields.pageArticle.checked,
        workStudy: fields.pageWorkStudy.checked,
        default: fields.pageDefault.checked
      },
      thresholds: {
        longStaySeconds: Number(fields.longStaySeconds.value) || DEFAULT_SETTINGS.thresholds.longStaySeconds,
        longStayScrollCount: Number(fields.longStayScrollCount.value) || DEFAULT_SETTINGS.thresholds.longStayScrollCount,
        mediumStaySeconds: Number(fields.mediumStaySeconds.value) || DEFAULT_SETTINGS.thresholds.mediumStaySeconds,
        directionChangeCount: Number(fields.directionChangeCount.value) || DEFAULT_SETTINGS.thresholds.directionChangeCount,
        revisitForegroundCount: Number(fields.revisitForegroundCount.value) || DEFAULT_SETTINGS.thresholds.revisitForegroundCount,
        revisitStaySeconds: Number(fields.revisitStaySeconds.value) || DEFAULT_SETTINGS.thresholds.revisitStaySeconds
      },
      cooldownSeconds: Number(fields.cooldownSeconds.value) || DEFAULT_SETTINGS.cooldownSeconds,
      maxPromptsPerPageLoad: Number(fields.maxPromptsPerPageLoad.value) || DEFAULT_SETTINGS.maxPromptsPerPageLoad,
      toneStyle,
      timerEnabled: fields.timerEnabled.checked,
      timerDefaultMinutes: Number(fields.timerDefaultMinutes.value) || DEFAULT_SETTINGS.timerDefaultMinutes,
      timerCurrentTabOnly: fields.timerCurrentTabOnly.checked,
      timerAllowPerType: fields.timerAllowPerType.checked,
      timerForceModalEnabled: fields.timerForceModalEnabled.checked,
      timerCooldownMinutes: Number(fields.timerCooldownMinutes.value) || DEFAULT_SETTINGS.timerCooldownMinutes,
      timerMaxModalCountPerLoad:
        Number(fields.timerMaxModalCountPerLoad.value) || DEFAULT_SETTINGS.timerMaxModalCountPerLoad,
      timerModalTone,
      perTypeTimerConfig
    };
  }

  async function loadSettings() {
    try {
      const response = await utils.sendMessage({ type: MESSAGE_TYPES.GET_SETTINGS });
      fillForm(response.settings || DEFAULT_SETTINGS);
    } catch (error) {
      fillForm(DEFAULT_SETTINGS);
      showStatus("读取失败了，先给你展示默认设置");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const response = await utils.sendMessage({ type: MESSAGE_TYPES.SAVE_SETTINGS, settings: readForm() });
      fillForm(response.settings || DEFAULT_SETTINGS);
      showStatus("设置已保存 💚");
    } catch (error) {
      showStatus("保存失败了，稍后再试试");
    }
  });

  document.getElementById("resetButton").addEventListener("click", async () => {
    try {
      const response = await utils.sendMessage({ type: MESSAGE_TYPES.SAVE_SETTINGS, settings: DEFAULT_SETTINGS });
      fillForm(response.settings || DEFAULT_SETTINGS);
      showStatus("已恢复默认设置");
    } catch (error) {
      showStatus("恢复默认失败");
    }
  });

  loadSettings();
})();
