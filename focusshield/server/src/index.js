// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import { initDb } from "./db.js";
// import { buildRoutes } from "./routes.js";

// dotenv.config();

// const app = express();
// app.use(express.json({ limit: "1mb" }));

// const origin = process.env.CORS_ORIGIN || "*";
// app.use(cors({ origin }));

// await initDb();

// app.get("/health", (req, res) => res.json({ ok: true }));

// buildRoutes(app);

// const port = Number(process.env.PORT || 8080);
// app.listen(port, () => {
//   console.log(`FocusShield server listening on :${port}`);
// });

// src/index.js
import express from "express";
import dotenv from "dotenv";
import { connectMongo } from "./db/mongo.js";

import analyzeInterventionRouter from "./routes/analyzeIntervention.js";
import dashboardRouter from "./routes/dashboard.js";
import eventBatchRouter from "./routes/eventBatch.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api", analyzeInterventionRouter);
app.use("/api", dashboardRouter);
app.use("/api", eventBatchRouter);

const PORT = process.env.PORT || 3000;

connectMongo(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });