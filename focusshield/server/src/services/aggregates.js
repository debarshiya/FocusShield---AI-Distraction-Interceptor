import Session from "../models/Session.js";

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function upsertEventBatch({ userId, metricsDelta = {}, recentPages = [] }) {
  const date = todayStr();

  const inc = {
    "metrics.scrollEvents": metricsDelta.scroll || 0,
    "metrics.tabSwitches": metricsDelta.tabSwitch || 0,
    "metrics.refreshes": metricsDelta.refresh || 0
  };

  const incDomain = {};
  for (const p of recentPages) {
    if (!p?.domain || typeof p.seconds !== "number") continue;
    incDomain[`timePerDomainSeconds.${p.domain}`] = p.seconds;
  }

  await Session.updateOne(
    { userId, date },
    { $setOnInsert: { userId, date }, $inc: { ...inc, ...incDomain } },
    { upsert: true }
  );
}

export async function bumpIntervention({ userId, trigger, hour }) {
  const date = todayStr();
  const h = String(hour);

  await Session.updateOne(
    { userId, date },
    {
      $setOnInsert: { userId, date },
      $inc: {
        "metrics.interventions": 1,
        [`interventionsByTrigger.${trigger}`]: 1,
        [`interventionsByHour.${h}`]: 1
      }
    },
    { upsert: true }
  );
}