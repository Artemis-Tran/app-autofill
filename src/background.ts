// background.ts

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const id = tab?.id;
  return (typeof id === "number" && id !== chrome.tabs.TAB_ID_NONE) ? id : null;
}

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "fill-form") return;
  const tabId = await getActiveTabId();
  if (tabId !== null) {
    await chrome.tabs.sendMessage(tabId, { type: "FILL_REQUEST" });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "POPUP_FILL") return;

  (async () => {
    const tabId = await getActiveTabId();
    if (tabId !== null) {
      await chrome.tabs.sendMessage(tabId, {
        type: "FILL_EXECUTE",
        payload: msg.payload
      });
    }
  })();
});
