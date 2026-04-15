(function initHistoryV2() {
  const utils = DecisionStopperUtils;
  const historyList = document.getElementById("historyList");
  const typeFilter = document.getElementById("typeFilter");
  const clearAllButton = document.getElementById("clearAllButton");
  let allItems = [];

  function renderEmpty(message) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">😵‍💫</div>
        <h2>现在这里还空着</h2>
        <p>${utils.escapeHtml(message)}</p>
      </div>
    `;
  }

  function getFilteredItems() {
    return typeFilter.value === "all" ? allItems : allItems.filter((item) => item.pageType === typeFilter.value);
  }

  function render() {
    const items = getFilteredItems();
    if (!items.length) {
      renderEmpty(
        typeFilter.value === "all"
          ? "下次在网页提醒里点一下“加入稍后再看”，这里就会帮你收好。"
          : "这个分类下还没有记录，可以切换筛选看看。"
      );
      return;
    }

    historyList.innerHTML = items
      .map((item) => `
        <article class="history-item" data-id="${item.id}">
          <h2>${utils.escapeHtml(item.title)}</h2>
          <p>${utils.escapeHtml(item.url)}</p>
          <div class="meta-row">
            <span>${MICRO_COPY.pageTypeLabels[item.pageType] || item.pageType}</span>
            <span>${utils.formatRelativeDateTime(item.savedAt)}</span>
          </div>
          <div class="actions-row">
            <button class="primary-button" data-action="open">重新打开</button>
            <button class="secondary-button" data-action="delete">删除</button>
          </div>
        </article>
      `)
      .join("");
  }

  async function loadHistory() {
    try {
      const response = await utils.sendMessage({ type: MESSAGE_TYPES.GET_HISTORY_DATA });
      allItems = response.savedList || [];
      render();
    } catch (error) {
      renderEmpty("刚刚没能读到本地记录，刷新一下页面再试试。");
    }
  }

  historyList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const itemId = button.closest("[data-id]")?.dataset.id;
    const item = allItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    if (button.dataset.action === "open") {
      await ExtApiHelper.createTab({ url: item.url });
      return;
    }

    try {
      const response = await utils.sendMessage({ type: MESSAGE_TYPES.DELETE_HISTORY_ITEM, id: item.id });
      allItems = response.savedList || [];
      render();
    } catch (error) {
      renderEmpty("删除失败了，稍后再试试。");
    }
  });

  typeFilter.addEventListener("change", render);

  clearAllButton.addEventListener("click", async () => {
    if (!allItems.length) {
      return;
    }

    try {
      const response = await utils.sendMessage({ type: MESSAGE_TYPES.CLEAR_HISTORY });
      allItems = response.savedList || [];
      render();
    } catch (error) {
      renderEmpty("清空失败了，刷新后再试一次。");
    }
  });

  loadHistory();
})();
