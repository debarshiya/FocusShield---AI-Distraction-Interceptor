// FocusShield content script
// Sends scroll pings and displays overlay on SHOW_OVERLAY message.

let scrollCount = 0;
let lastSend = Date.now();
const SEND_EVERY_MS = 15000;

function sendScrollPing(count) {
  chrome.runtime.sendMessage({ type: "SCROLL_PING", count }).catch(() => {});
}

window.addEventListener("scroll", () => {
  scrollCount += 1;
  const now = Date.now();
  if (now - lastSend >= SEND_EVERY_MS) {
    sendScrollPing(scrollCount);
    scrollCount = 0;
    lastSend = now;
  }
}, { passive: true });

// Overlay UI
let overlayRoot = null;

function removeOverlay() {
  if (overlayRoot) {
    overlayRoot.remove();
    overlayRoot = null;
  }
}

function createOverlay(payload) {
  removeOverlay();

  const container = document.createElement("div");
  container.id = "focusshield-overlay-root";

  // Shadow DOM to avoid CSS conflicts
  const shadow = container.attachShadow({ mode: "open" });

  const wrapper = document.createElement("div");
  wrapper.className = "fs-wrap";

  const gemini = payload?.gemini || {};
  const micro = Array.isArray(gemini.microResets) ? gemini.microResets : [];

  wrapper.innerHTML = `
    <div class="fs-modal">
      <div class="fs-header">
        <div class="fs-title">Focus check</div>
        <button class="fs-close" aria-label="Close">×</button>
      </div>

      <div class="fs-section">
        <div class="fs-label">Summary</div>
        <div class="fs-text">${escapeHtml(gemini.summary || "…")}</div>
      </div>

      <div class="fs-section">
        <div class="fs-label">Insight</div>
        <div class="fs-text">${escapeHtml(gemini.insight || "…")}</div>
      </div>

      <div class="fs-section">
        <div class="fs-label">Micro resets (10–90 seconds)</div>
        <ul class="fs-list">
          ${micro.map(x => `<li>${escapeHtml(x)}</li>`).join("")}
        </ul>
      </div>

      <div class="fs-section">
        <div class="fs-label">Next action</div>
        <div class="fs-text">${escapeHtml(gemini.nextActionSuggestion || "…")}</div>
      </div>

      <div class="fs-actions">
        <button class="fs-btn fs-primary" data-action="TAKE_RESET">Take reset</button>
        <button class="fs-btn" data-action="SNOOZE_5_MIN">Continue 5 minutes</button>
        <button class="fs-btn" data-action="DISABLE_SITE">Disable for this site</button>
      </div>

      <div class="fs-footer">
        <div class="fs-small">
          ${payload?.solana?.signature ? `Receipt: ${escapeHtml(payload.solana.signature)}` : "Receipt: pending or unavailable"}
        </div>
        <div class="fs-small">
          ${payload?.audio?.audioUrl ? `<button class="fs-link" data-action="PLAY_AUDIO">Read aloud</button>` : ""}
        </div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .fs-wrap { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.35); }
    .fs-modal { width: 420px; max-width: calc(100vw - 32px); background: #111; color: #fff; border-radius: 14px; box-shadow: 0 16px 40px rgba(0,0,0,0.4); padding: 14px 14px 12px 14px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
    .fs-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
    .fs-title { font-size: 16px; font-weight: 650; }
    .fs-close { background: transparent; border: 0; color: #fff; font-size: 22px; cursor: pointer; }
    .fs-section { margin: 10px 0; }
    .fs-label { font-size: 12px; opacity: 0.8; margin-bottom: 4px; }
    .fs-text { font-size: 13px; line-height: 1.35; opacity: 0.95; }
    .fs-list { margin: 6px 0 0 18px; padding: 0; font-size: 13px; line-height: 1.35; }
    .fs-actions { display:flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .fs-btn { padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); color:#fff; cursor:pointer; font-size: 13px; }
    .fs-primary { background: rgba(255,255,255,0.18); }
    .fs-footer { display:flex; justify-content: space-between; gap: 10px; margin-top: 10px; }
    .fs-small { font-size: 11px; opacity: 0.75; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fs-link { background: none; border: 0; color: #9ad; cursor: pointer; padding: 0; font-size: 11px; text-decoration: underline; }
  `;

  shadow.appendChild(style);
  shadow.appendChild(wrapper);

  // Handlers
  const closeBtn = shadow.querySelector(".fs-close");
  closeBtn.addEventListener("click", removeOverlay);

  shadow.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      if (action === "PLAY_AUDIO") {
        if (payload?.audio?.audioUrl) {
          playAudio(payload.audio.audioUrl);
        }
        return;
      }
      chrome.runtime.sendMessage({
        type: "USER_ACTION",
        action,
        interventionId: payload?.interventionId || null,
        domain: location.hostname
      }).catch(() => {});
      if (action === "DISABLE_SITE") {
        // simplest UX: just close
        removeOverlay();
      } else if (action === "TAKE_RESET") {
        removeOverlay();
      } else if (action === "SNOOZE_5_MIN") {
        removeOverlay();
      }
    });
  });

  document.documentElement.appendChild(container);
  overlayRoot = container;
}

function playAudio(url) {
  const audio = new Audio(url);
  audio.play().catch(() => {});
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "SHOW_OVERLAY") {
    createOverlay(msg.payload);
  }
});