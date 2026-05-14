const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");

dotenv.config();

const { ReadingStore } = require("./store");
const {
  normalizeCan,
  validateCanSetupPayload,
  validateCanPayload,
  validateCanChangePayload,
  validateReadingPayload,
  validateSettingsPayload,
  validateRateUpsertPayload,
  validateRateDraftPayload,
  isMonthString,
  isDayString,
  normalizeReading
} = require("./validation");

const PORT = Number(process.env.PORT || 8080);

const app = express();
const store = new ReadingStore();

function hashSecret(value) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(value, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

function verifySecret(value, storedHash) {
  if (typeof storedHash !== "string" || !storedHash) {
    return false;
  }

  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];
  if (!Number.isFinite(iterations) || !salt || !expected) {
    return false;
  }

  const actual = crypto.pbkdf2Sync(value, salt, iterations, 32, "sha256").toString("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function buildAuthStatus(settings) {
  return {
    canConfigured: Boolean(settings.canHash)
  };
}

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

app.get("/api/auth/status", async (_req, res, next) => {
  try {
    const settings = await store.getSecuritySettings();
    return res.json(buildAuthStatus(settings));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/setup", async (req, res, next) => {
  const { valid, errors } = validateCanSetupPayload(req.body);
  if (!valid) {
    return res.status(400).json({ message: "Invalid payload", errors });
  }

  try {
    const current = await store.getSecuritySettings();
    if (current.canHash) {
      return res.status(409).json({ message: "Customer Account Number is already configured" });
    }

    const settings = await store.saveInitialSecuritySetup({
      canHash: hashSecret(normalizeCan(req.body.can))
    });

    return res.json({ authenticated: true, ...buildAuthStatus(settings) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/can", async (req, res, next) => {
  const { valid, errors } = validateCanPayload(req.body);
  if (!valid) {
    return res.status(400).json({ message: "Invalid payload", errors });
  }

  try {
    const settings = await store.getSecuritySettings();
    if (!settings.canHash) {
      return res.status(409).json({ message: "Customer Account Number setup is required", setupRequired: true });
    }

    if (!verifySecret(normalizeCan(req.body.can), settings.canHash)) {
      return res.status(401).json({ message: "Customer Account Number did not match" });
    }

    return res.json({ authenticated: true, ...buildAuthStatus(settings) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/auth/can", async (req, res, next) => {
  const { valid, errors } = validateCanChangePayload(req.body);
  if (!valid) {
    return res.status(400).json({ message: "Invalid payload", errors });
  }

  try {
    const settings = await store.getSecuritySettings();
    if (!settings.canHash || !verifySecret(normalizeCan(req.body.currentCan), settings.canHash)) {
      return res.status(401).json({ message: "Current Customer Account Number did not match" });
    }

    const updated = await store.updateCanHash(hashSecret(normalizeCan(req.body.newCan)));
    return res.json({ updated: true, ...buildAuthStatus(updated) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/settings", async (_req, res, next) => {
  try {
    const data = await store.getSettings();
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

app.put("/api/settings", async (req, res, next) => {
  const { valid, errors } = validateSettingsPayload(req.body);
  if (!valid) {
    return res.status(400).json({
      message: "Invalid payload",
      errors
    });
  }

  try {
    const data = await store.saveSettings(req.body);
    return res.json({
      message: "Settings saved",
      data
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/rates", async (req, res, next) => {
  const limitRaw = Number(req.query.limit || 240);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 240;

  try {
    const data = await store.getRateHistory(limit);
    res.json({
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
});

app.put("/api/rates/:month", async (req, res, next) => {
  const month = req.params.month;
  if (!isMonthString(month)) {
    return res.status(400).json({
      message: "Invalid payload",
      errors: ["month path parameter must be in YYYY-MM format"]
    });
  }

  const { valid, errors } = validateRateUpsertPayload(req.body);
  if (!valid) {
    return res.status(400).json({
      message: "Invalid payload",
      errors
    });
  }

  try {
    const data = await store.upsertMonthlyRate(month, req.body.ratePerKwh, {
      source: req.body.source,
      sourceUrl: req.body.sourceUrl,
      verified: req.body.verified
    });
    return res.json({
      message: "Rate saved",
      data
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/rates/:month", async (req, res, next) => {
  const month = req.params.month;
  if (!isMonthString(month)) {
    return res.status(400).json({
      message: "Invalid payload",
      errors: ["month path parameter must be in YYYY-MM format"]
    });
  }

  try {
    const deleted = await store.deleteMonthlyRate(month);
    if (!deleted) {
      return res.status(404).json({ message: "Rate not found" });
    }
    return res.json({
      message: "Rate deleted",
      data: deleted
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/rates/fetch-draft", async (req, res, next) => {
  const { valid, errors } = validateRateDraftPayload(req.body);
  if (!valid) {
    return res.status(400).json({
      message: "Invalid payload",
      errors
    });
  }

  try {
    const data = await store.fetchRateDraftFromUrl(req.body.url, req.body.month);
    return res.json({
      message: "Rate draft fetched",
      data
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

app.get("/api/readings/aggregate", async (req, res, next) => {
  const fromDay = typeof req.query.from === "string" ? req.query.from : "";
  const toDay = typeof req.query.to === "string" ? req.query.to : "";

  if (!isDayString(fromDay) || !isDayString(toDay) || fromDay > toDay) {
    return res.status(400).json({
      message: "Invalid payload",
      errors: ["from and to query parameters must be valid YYYY-MM-DD dates with from <= to"]
    });
  }

  try {
    const data = await store.getReadingAggregates({ fromDay, toDay });
    return res.json(data);
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
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : error.message,
    details: error.message
  });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
