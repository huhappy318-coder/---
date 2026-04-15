const extApi = typeof browser !== "undefined" ? browser : chrome;

const ExtApiHelper = (() => {
  function normalizeError(error) {
    return error instanceof Error ? error : new Error(error && error.message ? error.message : String(error));
  }

  function promisifyChrome(fn, context, args) {
    return new Promise((resolve, reject) => {
      fn.call(context, ...args, (result) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          reject(normalizeError(chrome.runtime.lastError));
          return;
        }
        resolve(result);
      });
    });
  }

  function call(namespace, method, ...args) {
    const fn = namespace && namespace[method];
    if (typeof fn !== "function") {
      return Promise.reject(new Error(`API not supported: ${method}`));
    }

    if (typeof browser === "undefined") {
      return promisifyChrome(fn, namespace, args);
    }

    try {
      const result = fn.apply(namespace, args);
      if (result && typeof result.then === "function") {
        return result;
      }

      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(normalizeError(error));
    }
  }

  function sendMessage(message) {
    return call(extApi.runtime, "sendMessage", message);
  }

  function storageGet(keys) {
    return call(extApi.storage.local, "get", keys);
  }

  function storageSet(items) {
    return call(extApi.storage.local, "set", items);
  }

  function storageRemove(keys) {
    return call(extApi.storage.local, "remove", keys);
  }

  function queryTabs(queryInfo) {
    return call(extApi.tabs, "query", queryInfo);
  }

  function createTab(createProperties) {
    return call(extApi.tabs, "create", createProperties);
  }

  function removeTab(tabId) {
    return call(extApi.tabs, "remove", tabId);
  }

  function updateTab(tabId, updateProperties) {
    return call(extApi.tabs, "update", tabId, updateProperties);
  }

  return {
    call,
    sendMessage,
    storageGet,
    storageSet,
    storageRemove,
    queryTabs,
    createTab,
    removeTab,
    updateTab
  };
})();
