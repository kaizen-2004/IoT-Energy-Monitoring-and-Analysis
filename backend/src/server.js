const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const { ReadingStore } = require("./store");
const { validateReadingPayload, normalizeReading } = require("./validation");

const PORT = Number(process.env.PORT || 8080);

const app = express();
const store = new ReadingStore();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/health/db", async (_req, res, next) => {
  try {
    const count = await store.getCount();
    res.json({
      status: "ok",
      readingCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/readings", async (req, res, next) => {
  const { valid, errors } = validateReadingPayload(req.body);
  if (!valid) {
    return res.status(400).json({
      message: "Invalid payload",
      errors
    });
  }

  try {
    const reading = normalizeReading(req.body);
    const stored = await store.add(reading);

    return res.status(201).json({
      message: "Reading stored",
      data: stored
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/readings", async (req, res, next) => {
  const applianceId = req.query.applianceId || undefined;
  const limitRaw = Number(req.query.limit || 120);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 5000) : 120;

  try {
    const data = await store.getReadings({ applianceId, limit });

    res.json({
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/alerts", async (req, res, next) => {
  const limitRaw = Number(req.query.limit || 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 50;

  try {
    const data = await store.getAlerts(limit);
    res.json({
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/summary", async (req, res, next) => {
  const windowRaw = Number(req.query.windowMinutes || 60);
  const windowMinutes = Number.isFinite(windowRaw) ? Math.min(Math.max(windowRaw, 1), 1440) : 60;

  try {
    const summary = await store.getSummary(windowMinutes);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    message: "Internal server error",
    details: error.message
  });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
