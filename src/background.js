/* KinoCaps — service worker.
   Small on purpose: keeps the toolbar badge honest, owns the keyboard
   shortcuts, and opens the studio once on install. All caption work stays in
   the content script. */

const TOGGLE_COMMAND = "toggle-captions";
const BADGE_OFF_COLOR = "#3a3a3c";

async function isEnabled() {
  try {
    const { enabled = true } = await chrome.storage.sync.get({ enabled: true });
    return enabled !== false;
  } catch {
    return true;
  }
}

async function refreshBadge() {
  const on = await isEnabled();
  try {
    await chrome.action.setBadgeText({ text: on ? "" : "OFF" });
    if (!on) await chrome.action.setBadgeBackgroundColor({ color: BADGE_OFF_COLOR });
    await chrome.action.setTitle({
      title: on ? "KinoCaps — caption studio" : "KinoCaps — paused",
    });
  } catch {
    /* action unavailable during shutdown; next event retries */
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  refreshBadge();
  // First run: land in the studio instead of an empty popup.
  if (details.reason === "install") {
    try {
      chrome.runtime.openOptionsPage();
    } catch {
      /* no options page available */
    }
  }
});

chrome.runtime.onStartup.addListener(refreshBadge);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) refreshBadge();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== TOGGLE_COMMAND) return;
  const on = await isEnabled();
  try {
    await chrome.storage.sync.set({ enabled: !on });
  } catch {
    /* quota or sync unavailable — leave the current state */
  }
});

refreshBadge();
