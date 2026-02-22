// FocusShield service worker (MV3)
// Tracks tab time, tab switching, refreshes, receives scroll metrics, triggers interventions.

const DEFAULT_PREFS = {
  enabled: true,
  voiceEnabled: true,
  highRiskDomains: ["x.com", "twitter.com", "tiktok.com", "instagram.com", "reddit.com", "facebook.com", "youtube.com"],
  thresholds: {
    tabSwitchesPer5Min: 12,
    doomscrollMinutes: 10,
    scrollEventsPer10Min: 80,
    refreshesPer3Min: 4,
    lateNightHighRiskMinutes: 7
  },
  quietHours: { enabled: true, start: "00:00", end: "06:00" },
  cooldownMinutes: 8,
  backendBaseUrl: "http://localhost:8080" // change to DO URL when deployed
};

const ROLLING = {
  tabSwitches: [], // timestamps (ms)
  refreshes: [],   // timestamps (ms)
  scrollEvents: [] // timestamps (ms) for scroll events (counted from content script)
};

let state = {
  userId: null,
  prefs: null,
  activeTabId: null,
  activeUrl: null,
  activeDomain: null,
  activeTitle: null,
  activeSinceMs: null,
  domainSeconds: {},  // domain -> total seconds (since extension start)
  recentPages: [],    // [{domain,title,seconds,ts}]
  lastInterventionMs: 0
};

function now() { return Date.now(); }

function parseDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function withinQuietHours(prefs) {
  if (!prefs.quietHours?.enabled) return false;
  const [sh, sm] = prefs.quietHours.start.split(":").map(Number);
  const [eh, em] = prefs.quietHours.end.split(":").map(Number);

  const d = new Date();
  const minutes = d.getHours() * 60 + d.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  // handle overnight windows
  if (start <= end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

function localHour() {
  return new Date().getHours();
}

function pruneRolling(arr, windowMs) {
  const cutoff = now() - windowMs;
  while (arr.length && arr[0] < cutoff) arr.shift();
}

function rollingCount(arr, windowMs) {
  pruneRolling(arr, windowMs);
  return arr.length;
}

async function loadOrInit() {
  const stored = await chrome.storage.local.get(["userId", "prefs", "state"]);
  if (!stored.userId) {
    const userId = `anon_${crypto.randomUUID()}`;
    await chrome.storage.local.set({ userId });
    stored.userId = userId;
  }
  if (!stored.prefs) {
    await chrome.storage.local.set({ prefs: DEFAULT_PREFS });
    stored.prefs = DEFAULT_PREFS;
  }

  state.userId = stored.userId;
  state.prefs = stored.prefs;

  // Restore minimal state (optional)
  if (stored.state) {
    state.domainSeconds = stored.state.domainSeconds || {};
    state.recentPages = stored.state.recentPages || [];
    state.lastInterventionMs = stored.state.lastInterventionMs || 0;
  }
}

async function persistState() {
  await chrome.storage.local.set({
    state: {
      domainSeconds: state.domainSeconds,
      recentPages: state.recentPages.slice(-20),
      lastInterventionMs: state.lastInterventionMs
    }
  });
}

async function getActiveTabInfo(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const url = tab.url || null;
  const domain = url ? parseDomain(url) : null;
  const title = tab.title || "";
  return { url, domain, title };
}

function updateRecentPages(domain, title, seconds) {
  if (!domain) return;
  const entry = { domain, title: title || "", seconds, ts: new Date().toISOString() };
  state.recentPages.push(entry);
  if (state.recentPages.length > 20) state.recentPages.shift();
}

function flushActiveTime() {
  if (!state.activeDomain || state.activeSinceMs == null) return;
  const elapsedSec = Math.max(0, Math.floor((now() - state.activeSinceMs) / 1000));
  if (elapsedSec === 0) return;

  state.domainSeconds[state.activeDomain] = (state.domainSeconds[state.activeDomain] || 0) + elapsedSec;
  updateRecentPages(state.activeDomain, state.activeTitle, elapsedSec);

  // reset timer to now (so we flush increments)
  state.activeSinceMs = now();
}

function isHighRiskDomain(prefs, domain) {
  if (!domain) return false;
  return (prefs.highRiskDomains || []).some(d => domain === d || domain.endsWith(`.${d}`));
}

function cooldownOk(prefs) {
  const cooldownMs = (prefs.cooldownMinutes || 8) * 60_000;
  return now() - state.lastInterventionMs >= cooldownMs;
}

async function postJson(path, body) {
  const url = `${state.prefs.backendBaseUrl}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  return res.json().catch(() => ({}));
}

async function sendEventBatch(metricsDelta = {}) {
  if (!state.prefs.enabled) return;

  const body = {
    userId: state.userId,
    events: [],
    metricsDelta,
    recentPages: state.recentPages.slice(-10),
    snapshot: {
      domainSeconds: state.domainSeconds,
      localHour: localHour()
    }
  };

  // Best-effort, do not crash
  try {
    await postJson("/event-batch", body);
  } catch (e) {
    // ignore
  }
}

async function triggerIntervention(trigger, context) {
  if (!state.prefs.enabled) return;
  if (!cooldownOk(state.prefs)) return;

  state.lastInterventionMs = now();
  await persistState();

  const payload = {
    userId: state.userId,
    trigger,
    recentPages: state.recentPages.slice(-10),
    metrics: context.metrics,
    timeContext: { localHour: localHour(), quietHours: withinQuietHours(state.prefs) },
    prefs: { voiceEnabled: !!state.prefs.voiceEnabled }
  };

  let resp;
  try {
    resp = await postJson("/analyze-intervention", payload);
  } catch (e) {
    resp = {
      interventionId: `local_${crypto.randomUUID()}`,
      gemini: {
        summary: "You have been browsing rapidly across pages.",
        insight: "This looks like a distraction episode. A short reset may help you regain focus.",
        microResets: ["Stand up and take 5 slow breaths.", "Write the next task you want to finish in one sentence.", "Close one unnecessary tab right now."],
        nextActionSuggestion: "Pick one small task and work for 10 minutes.",
        tone: "supportive",
        scoreBreakdown: {}
      },
      audio: null,
      solana: null
    };
  }

  // Notify the active tab to show overlay
  const tabId = state.activeTabId;
  if (tabId != null) {
    chrome.tabs.sendMessage(tabId, { type: "SHOW_OVERLAY", payload: resp }).catch(() => {});
  }

  // also send events best-effort
  await sendEventBatch({ intervention: 1, trigger });
}

function computeContextAndMaybeTrigger() {
  if (!state.prefs.enabled) return;
  flushActiveTime();

  // rolling windows
  const tabSwitchesLast5Min = rollingCount(ROLLING.tabSwitches, 5 * 60_000);
  const refreshesLast3Min = rollingCount(ROLLING.refreshes, 3 * 60_000);
  const scrollEventsLast10Min = rollingCount(ROLLING.scrollEvents, 10 * 60_000);

  const domain = state.activeDomain;
  const highRisk = isHighRiskDomain(state.prefs, domain);

  // Estimate minutes on current domain from accumulated seconds (rough)
  const secondsOnDomain = state.domainSeconds[domain] || 0;
  const minutesOnDomain = Math.floor(secondsOnDomain / 60);

  // Doomscrolling
  const doomscroll =
    highRisk &&
    minutesOnDomain >= state.prefs.thresholds.doomscrollMinutes &&
    scrollEventsLast10Min >= state.prefs.thresholds.scrollEventsPer10Min;

  // Tab switching
  const switching = tabSwitchesLast5Min >= state.prefs.thresholds.tabSwitchesPer5Min;

  // Refresh loop
  const refreshing = refreshesLast3Min >= state.prefs.thresholds.refreshesPer3Min;

  // Late-night
  const late = withinQuietHours(state.prefs);
  const lateNightRisk = late && highRisk && minutesOnDomain >= state.prefs.thresholds.lateNightHighRiskMinutes;

  const metrics = { tabSwitchesLast5Min, refreshesLast3Min, scrollEventsLast10Min, minutesOnDomain, domain, highRisk, late };

  if (doomscroll && cooldownOk(state.prefs)) {
    triggerIntervention("DOOMSCROLLING", { metrics }).catch(() => {});
  } else if (switching && cooldownOk(state.prefs)) {
    triggerIntervention("TAB_SWITCHING", { metrics }).catch(() => {});
  } else if (refreshing && cooldownOk(state.prefs)) {
    triggerIntervention("REFRESH_LOOP", { metrics }).catch(() => {});
  } else if (lateNightRisk && cooldownOk(state.prefs)) {
    triggerIntervention("LATE_NIGHT_RISK", { metrics }).catch(() => {});
  }

  // send periodic batches
  sendEventBatch({ tabSwitchesLast5Min, refreshesLast3Min, scrollEventsLast10Min }).catch(() => {});
}

// Message handling from content script and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SCROLL_PING") {
    // count each ping as 1 scroll event (or add msg.count)
    const count = Number(msg.count || 1);
    for (let i = 0; i < count; i++) ROLLING.scrollEvents.push(now());
    sendResponse({ ok: true });
    return true;
  }

  if (msg?.type === "USER_ACTION") {
    // log action
    sendEventBatch({ userAction: msg.action, interventionId: msg.interventionId }).catch(() => {});
    // handle snooze by advancing lastInterventionMs
    if (msg.action === "SNOOZE_5_MIN") {
      state.lastInterventionMs = now() + 5 * 60_000 - (state.prefs.cooldownMinutes * 60_000);
      persistState().catch(() => {});
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg?.type === "GET_STATUS") {
    sendResponse({
      userId: state.userId,
      prefs: state.prefs,
      domainSeconds: state.domainSeconds,
      recentPages: state.recentPages.slice(-10),
      lastInterventionMs: state.lastInterventionMs
    });
    return true;
  }

  if (msg?.type === "SET_PREFS") {
    state.prefs = { ...state.prefs, ...msg.prefs };
    chrome.storage.local.set({ prefs: state.prefs }).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

// Tab events
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!state.prefs?.enabled) return;
  flushActiveTime();
  ROLLING.tabSwitches.push(now());

  state.activeTabId = tabId;
  const info = await getActiveTabInfo(tabId).catch(() => ({ url: null, domain: null, title: "" }));
  state.activeUrl = info.url;
  state.activeDomain = info.domain;
  state.activeTitle = info.title;
  state.activeSinceMs = now();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!state.prefs?.enabled) return;

  if (changeInfo.status === "loading") {
    // rough refresh detection: same tab loads
    ROLLING.refreshes.push(now());
  }

  // If the active tab changed URL, update domain/title
  if (tabId === state.activeTabId && changeInfo.url) {
    flushActiveTime();
    state.activeUrl = changeInfo.url;
    state.activeDomain = parseDomain(changeInfo.url);
    state.activeTitle = tab.title || "";
    state.activeSinceMs = now();
  }
});

// Startup
(async function main() {
  await loadOrInit();
  // Initialize active tab on startup
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) {
    state.activeTabId = tab.id;
    state.activeUrl = tab.url || null;
    state.activeDomain = tab.url ? parseDomain(tab.url) : null;
    state.activeTitle = tab.title || "";
    state.activeSinceMs = now();
  }

  // periodic loop
  setInterval(() => {
    try { computeContextAndMaybeTrigger(); } catch {}
  }, 60_000);


 setTimeout(() => {
  if (state.activeTabId != null) {
    chrome.tabs.sendMessage(state.activeTabId, {
      type: "SHOW_OVERLAY",
      payload: {
        interventionId: "test_overlay",
        gemini: {
          summary: "Focus check-in: attention drift detected",
insight: "Your browsing pattern suggests a short distraction cycle. A quick reset can restore clarity.",
          microResets: [
            "Take 3 deep breaths.",
            "Look away from the screen for 10 seconds.",
            "Write one thing you want to finish next."
          ],
          nextActionSuggestion: "Work for 5 focused minutes."
        },
        audio: null,
        solana: null
      }
    }).catch(() => {}); 
  }
}, 5000);



})();