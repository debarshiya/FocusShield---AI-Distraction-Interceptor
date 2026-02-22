// // import express from "express";
// // import cors from "cors";
// // import dotenv from "dotenv";
// // import { initDb } from "./db.js";
// // import { buildRoutes } from "./routes.js";

// // dotenv.config();

// // const app = express();
// // app.use(express.json({ limit: "1mb" }));

// // const origin = process.env.CORS_ORIGIN || "*";
// // app.use(cors({ origin }));

// // await initDb();

// // app.get("/health", (req, res) => res.json({ ok: true }));

// // buildRoutes(app);

// // const port = Number(process.env.PORT || 8080);
// // app.listen(port, () => {
// //   console.log(`FocusShield server listening on :${port}`);
// // });

// // src/index.js
// import express from "express";
// import dotenv from "dotenv";
// import { connectMongo } from "./db/mongo.js";

// import analyzeInterventionRouter from "./routes/analyzeIntervention.js";
// import dashboardRouter from "./routes/dashboard.js";
// import eventBatchRouter from "./routes/eventBatch.js";

// dotenv.config();

// const app = express();
// app.use(express.json());

// app.use("/api", analyzeInterventionRouter);
// app.use("/api", dashboardRouter);
// app.use("/api", eventBatchRouter);

// const PORT = process.env.PORT || 3000;

// connectMongo(process.env.MONGODB_URI)
//   .then(() => {
//     app.listen(PORT, () => {
//       console.log(`[server] running on http://localhost:${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error("Failed to connect to MongoDB", err);
//   });

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectMongo from "./db/mongo.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Health check (optional but recommended)
app.get("/", (req, res) => {
  res.json({ status: "FocusShield backend running" });
});

// --- REQUIRED ROUTES ---

// Receives telemetry + metrics
app.post("/event-batch", async (req, res) => {
  const {
    userId,
    events,
    metricsDelta,
    recentPages,
    snapshot
  } = req.body;

  // For now: just log (later store in Mongo)
  console.log("[event-batch]", {
    userId,
    metricsDelta,
    snapshot
  });

  res.json({ ok: true });
});

// Produces intervention content
app.post("/analyze-intervention", async (req, res) => {
  const { userId, trigger, metrics, timeContext, prefs } = req.body;

  console.log("[intervention]", trigger, metrics);

  // TEMP: static response (extension already supports this)
  res.json({
    interventionId: `srv_${crypto.randomUUID()}`,
    gemini: {
      summary: "You’ve been switching context frequently.",
      insight: "This pattern often reduces deep focus.",
      microResets: [
        "Close one unnecessary tab.",
        "Take 5 slow breaths.",
        "Write down the next task you’ll finish."
      ],
      nextActionSuggestion: "Work on one task for 10 minutes."
    },
    audio: null,
    solana: null
  });
});

// Start server
connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });