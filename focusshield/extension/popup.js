// async function getStatus() {
//   return chrome.runtime.sendMessage({ type: "GET_STATUS" });
// }

// async function setPrefs(prefs) {
//   return chrome.runtime.sendMessage({ type: "SET_PREFS", prefs });
// }

// function qs(id) { return document.getElementById(id); }

// (async function init() {
//   const st = await getStatus();
//   const prefs = st.prefs ?? { enabled: true };

//   qs("enabled").checked = prefs.enabled;
//   // qs("enabled").checked = !!st.prefs.enabled;
//   qs("voiceEnabled").checked = !!st.prefs.voiceEnabled;
//   qs("backendBaseUrl").value = st.prefs.backendBaseUrl || "";

//   qs("tabSwitchesPer5Min").value = st.prefs.thresholds.tabSwitchesPer5Min;
//   qs("doomscrollMinutes").value = st.prefs.thresholds.doomscrollMinutes;
//   qs("scrollEventsPer10Min").value = st.prefs.thresholds.scrollEventsPer10Min;
//   qs("refreshesPer3Min").value = st.prefs.thresholds.refreshesPer3Min;

//   qs("enabled").addEventListener("change", async () => {
//     await setPrefs({ enabled: qs("enabled").checked });
//   });

//   qs("voiceEnabled").addEventListener("change", async () => {
//     await setPrefs({ voiceEnabled: qs("voiceEnabled").checked });
//   });

//   qs("save").addEventListener("click", async () => {
//     const backendBaseUrl = qs("backendBaseUrl").value.trim();
//     const thresholds = {
//       tabSwitchesPer5Min: Number(qs("tabSwitchesPer5Min").value),
//       doomscrollMinutes: Number(qs("doomscrollMinutes").value),
//       scrollEventsPer10Min: Number(qs("scrollEventsPer10Min").value),
//       refreshesPer3Min: Number(qs("refreshesPer3Min").value)
//     };
//     await setPrefs({ backendBaseUrl, thresholds: { ...st.prefs.thresholds, ...thresholds } });
//     const fresh = await getStatus();
//     qs("stats").textContent = JSON.stringify({
//       userId: fresh.userId,
//       recentPages: fresh.recentPages,
//       domainSeconds: fresh.domainSeconds
//     }, null, 2);
//   });

//   qs("stats").textContent = JSON.stringify({
//     userId: st.userId,
//     recentPages: st.recentPages,
//     domainSeconds: st.domainSeconds
//   }, null, 2);
// })();






(async function init() {
  const st = await getStatus();

  const DEFAULT_PREFS = {
    enabled: true,
    voiceEnabled: false,
    backendBaseUrl: "http://localhost:8080",
    thresholds: {
      tabSwitchesPer5Min: 15,
      doomscrollMinutes: 5,
      scrollEventsPer10Min: 200,
      refreshesPer3Min: 5
    }
  };

  const prefs = {
    ...DEFAULT_PREFS,
    ...(st.prefs ?? {}),
    thresholds: {
      ...DEFAULT_PREFS.thresholds,
      ...(st.prefs?.thresholds ?? {})
    }
  };

  qs("enabled").checked = prefs.enabled;
  qs("voiceEnabled").checked = prefs.voiceEnabled;
  qs("backendBaseUrl").value = prefs.backendBaseUrl;

  qs("tabSwitchesPer5Min").value = prefs.thresholds.tabSwitchesPer5Min;
  qs("doomscrollMinutes").value = prefs.thresholds.doomscrollMinutes;
  qs("scrollEventsPer10Min").value = prefs.thresholds.scrollEventsPer10Min;
  qs("refreshesPer3Min").value = prefs.thresholds.refreshesPer3Min;

  qs("enabled").addEventListener("change", async () => {
    await setPrefs({ enabled: qs("enabled").checked });
  });

  qs("voiceEnabled").addEventListener("change", async () => {
    await setPrefs({ voiceEnabled: qs("voiceEnabled").checked });
  });

  qs("save").addEventListener("click", async () => {
    const backendBaseUrl = qs("backendBaseUrl").value.trim();
    const thresholds = {
      tabSwitchesPer5Min: Number(qs("tabSwitchesPer5Min").value),
      doomscrollMinutes: Number(qs("doomscrollMinutes").value),
      scrollEventsPer10Min: Number(qs("scrollEventsPer10Min").value),
      refreshesPer3Min: Number(qs("refreshesPer3Min").value)
    };

    await setPrefs({
      backendBaseUrl,
      thresholds: { ...prefs.thresholds, ...thresholds }
    });
  });

  qs("stats").textContent = JSON.stringify({
    userId: st.userId,
    recentPages: st.recentPages,
    domainSeconds: st.domainSeconds
  }, null, 2);
})();