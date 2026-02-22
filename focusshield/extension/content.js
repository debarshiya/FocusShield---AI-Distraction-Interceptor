// FocusShield content script
// Sends scroll pings and displays overlay on SHOW_OVERLAY message.

let scrollCount = 0;
let lastSend = Date.now();
const SEND_EVERY_MS = 15000;
let keyHandler = null;

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
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}

function createOverlay(payload) {
  removeOverlay();

  const container = document.createElement("div");
  container.id = "focusshield-overlay-root";
 function onKey(e) {
  if (e.key === "Escape") removeOverlay();
}
document.addEventListener("keydown", onKey, { once: true });
  // Shadow DOM to avoid CSS conflicts
  const shadow = container.attachShadow({ mode: "open" });

  const wrapper = document.createElement("div");
  wrapper.className = "fs-wrap";

  const gemini = payload?.gemini || {};
  const micro = Array.isArray(gemini.microResets) ? gemini.microResets : [];

  wrapper.innerHTML = `
  <div class="fs-backdrop"></div>

  <div class="fs-modal" role="dialog" aria-modal="true">
    <div class="fs-topbar">
      <div class="fs-brand">
        <div class="fs-badge">FS</div>
        <div>
          <div class="fs-title">FocusShield</div>
          <div class="fs-subtitle">Micro-intervention</div>
        </div>
      </div>
      <button class="fs-close" aria-label="Close">×</button>
    </div>

    <div class="fs-body">
      <div class="fs-card">
        <div class="fs-label">Summary</div>
        <div class="fs-text">${escapeHtml(gemini.summary || "…")}</div>
      </div>

      <div class="fs-card">
        <div class="fs-label">Insight</div>
        <div class="fs-text">${escapeHtml(gemini.insight || "…")}</div>
      </div>

      <div class="fs-card">
        <div class="fs-label">Micro resets</div>
        <ul class="fs-list">
          ${micro.map(x => `<li>${escapeHtml(x)}</li>`).join("")}
        </ul>
      </div>

      <div class="fs-card">
        <div class="fs-label">Next action</div>
        <div class="fs-text">${escapeHtml(gemini.nextActionSuggestion || "…")}</div>
      </div>

      <div class="fs-actions">
        <button class="fs-btn fs-primary" data-action="TAKE_RESET">Take reset</button>
        <button class="fs-btn" data-action="SNOOZE_5_MIN">Continue 5 minutes</button>
        <button class="fs-btn fs-danger" data-action="DISABLE_SITE">Disable for this site</button>
        ${payload?.audio?.audioUrl ? `<button class="fs-btn fs-ghost" data-action="PLAY_AUDIO">Read aloud</button>` : ""}
      </div>
    </div>

    <div class="fs-footer">
      <div class="fs-meta">
        ${payload?.solana?.signature ? `Receipt: ${escapeHtml(payload.solana.signature)}` : "Receipt: pending or unavailable"}
      </div>
      <div class="fs-meta">
        ${location.hostname}
      </div>
    </div>
  </div>
`;
  const style = document.createElement("style");
  style.textContent = `
  :host { all: initial; }

  .fs-wrap{
    position: fixed; inset: 0; z-index: 2147483647;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
  }

  .fs-backdrop{
    position: absolute; inset: 0;
    background: radial-gradient(900px 600px at 10% 10%, rgba(124,92,255,.22), transparent 55%),
                radial-gradient(800px 600px at 90% 0%, rgba(0,212,255,.18), transparent 60%),
                rgba(0,0,0,.52);
    backdrop-filter: blur(8px);
    animation: fsFade .18s ease-out;
  }

  .fs-modal{
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: 480px;
    max-width: calc(100vw - 28px);
    color: rgba(255,255,255,.92);
    background: rgba(12,14,22,.78);
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 18px;
    box-shadow: 0 24px 70px rgba(0,0,0,.55);
    overflow: hidden;
    animation: fsPop .22s ease-out;
  }

  .fs-topbar{
    display:flex; align-items:center; justify-content:space-between;
    padding: 12px 12px;
    background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0));
    border-bottom: 1px solid rgba(255,255,255,.10);
  }

  .fs-brand{ display:flex; align-items:center; gap:10px; }
  .fs-badge{
    width: 36px; height: 36px; border-radius: 12px;
    display:grid; place-items:center;
    font-weight: 800;
    background: linear-gradient(135deg, rgba(124,92,255,.9), rgba(0,212,255,.65));
    box-shadow: 0 12px 30px rgba(0,0,0,.35);
  }
  .fs-title{ font-weight: 780; font-size: 14px; line-height:1.05; }
  .fs-subtitle{ font-size: 11px; opacity:.72; margin-top:2px; }

  .fs-close{
    width: 34px; height: 34px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.06);
    color: rgba(255,255,255,.92);
    font-size: 20px;
    cursor: pointer;
  }
  .fs-close:hover{ background: rgba(255,255,255,.10); }

  .fs-body{ padding: 12px; display:flex; flex-direction:column; gap:10px; }

  .fs-card{
    padding: 10px 10px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(255,255,255,.05);
  }

  .fs-label{ font-size: 11px; opacity: .70; margin-bottom: 6px; }
  .fs-text{ font-size: 13px; line-height: 1.4; opacity: .96; }

  .fs-list{
    margin: 0; padding-left: 18px;
    font-size: 13px; line-height: 1.4;
  }
  .fs-list li{ margin: 6px 0; }

  .fs-actions{
    display:flex; flex-wrap:wrap;
    gap: 8px;
    margin-top: 4px;
  }

  .fs-btn{
    padding: 9px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.06);
    color: rgba(255,255,255,.92);
    cursor:pointer;
    font-size: 13px;
    transition: transform .12s ease, background .12s ease;
  }
  .fs-btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.10); }
  .fs-btn:active{ transform: translateY(0px); }

  .fs-primary{
    background: linear-gradient(135deg, rgba(124,92,255,.9), rgba(0,212,255,.55));
    border-color: rgba(255,255,255,.18);
    font-weight: 720;
  }
  .fs-primary:hover{ background: linear-gradient(135deg, rgba(124,92,255,.95), rgba(0,212,255,.62)); }

  .fs-danger{
    background: rgba(239,68,68,.10);
    border-color: rgba(239,68,68,.25);
  }

  .fs-ghost{
    background: transparent;
    border-style: dashed;
    opacity: .95;
  }

  .fs-footer{
    display:flex; justify-content:space-between; gap: 10px;
    padding: 10px 12px;
    border-top: 1px solid rgba(255,255,255,.10);
    background: rgba(0,0,0,.15);
  }
  .fs-meta{
    font-size: 11px;
    opacity: .70;
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @keyframes fsFade{
    from{ opacity: 0; } to{ opacity: 1; }
  }
  @keyframes fsPop{
    from{ opacity: 0; transform: translate(-50%, -48%) scale(.98); }
    to{ opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }

  @media (max-width: 420px){
    .fs-modal{ width: 96vw; }
  }
`;

  shadow.appendChild(style);
  shadow.appendChild(wrapper);
  shadow.querySelector(".fs-backdrop")?.addEventListener("click", removeOverlay);

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