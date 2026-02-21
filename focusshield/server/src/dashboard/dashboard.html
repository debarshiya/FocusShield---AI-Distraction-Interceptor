<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>FocusShield Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; }
    .row { display: flex; gap: 18px; flex-wrap: wrap; }
    .card { border: 1px solid #ddd; border-radius: 12px; padding: 14px; width: 420px; }
    input { padding: 8px; width: 320px; }
    button { padding: 8px 10px; }
    .small { font-size: 12px; color: #444; }
    ul { margin: 8px 0 0 18px; }
  </style>
</head>
<body>
  <h2>FocusShield Dashboard</h2>
  <div class="small">Enter your userId (from extension popup stats) and load analytics.</div>

  <div style="margin: 10px 0;">
    <input id="userId" placeholder="anon_..." />
    <button id="load">Load</button>
  </div>

  <div class="row">
    <div class="card">
      <h3>Time per domain (minutes)</h3>
      <canvas id="chartDomains"></canvas>
    </div>

    <div class="card">
      <h3>Interventions by trigger</h3>
      <canvas id="chartTriggers"></canvas>
    </div>

    <div class="card">
      <h3>Interventions by hour</h3>
      <canvas id="chartHours"></canvas>
    </div>

    <div class="card">
      <h3>Verified receipts (Solana)</h3>
      <ul id="receipts"></ul>
    </div>
  </div>

  <script>
    let chartDomains, chartTriggers, chartHours;

    async function loadData(userId) {
      const res = await fetch(`/dashboard-data?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }

    function renderBar(canvasId, labels, values) {
      const ctx = document.getElementById(canvasId).getContext("2d");
      return new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [{ label: canvasId, data: values }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    document.getElementById("load").addEventListener("click", async () => {
      const userId = document.getElementById("userId").value.trim();
      if (!userId) return;

      const data = await loadData(userId);

      if (chartDomains) chartDomains.destroy();
      if (chartTriggers) chartTriggers.destroy();
      if (chartHours) chartHours.destroy();

      chartDomains = renderBar(
        "chartDomains",
        data.timePerDomain.map(x => x.domain),
        data.timePerDomain.map(x => x.minutes)
      );

      chartTriggers = renderBar(
        "chartTriggers",
        data.interventionsByTrigger.map(x => x.trigger),
        data.interventionsByTrigger.map(x => x.count)
      );

      const hours = data.interventionsByHour.sort((a,b) => a.hour - b.hour);
      chartHours = renderBar(
        "chartHours",
        hours.map(x => String(x.hour)),
        hours.map(x => x.count)
      );

      const ul = document.getElementById("receipts");
      ul.innerHTML = "";
      (data.verifiedReceipts || []).forEach(r => {
        const li = document.createElement("li");
        li.textContent = `${r.trigger}: ${r.signature}`;
        ul.appendChild(li);
      });
    });
  </script>
</body>
</html>