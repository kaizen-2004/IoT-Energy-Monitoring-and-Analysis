const { query } = require("./db");

const DEFAULT_NODE_LABELS = ["Node 1", "Node 2", "Node 3"];
const DEFAULT_NODE_THRESHOLDS = [500, 800, 600];
const DEFAULT_SETTINGS = {
  electricityRate: 11.5,
  effectiveMonth: new Date().toISOString().slice(0, 7),
  nodeLabels: DEFAULT_NODE_LABELS,
  nodeThresholds: DEFAULT_NODE_THRESHOLDS,
  timezone: "Asia/Manila"
};

function isValidMonth(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function normalizeRateRow(row) {
  return {
    month: row.month_key,
    ratePerKwh: Number(row.rate_per_kwh),
    source:
      typeof row.source === "string" && row.source.trim().length > 0
        ? row.source.trim()
        : "manual",
    sourceUrl:
      typeof row.source_url === "string" && row.source_url.trim().length > 0
        ? row.source_url.trim()
        : null,
    verified: Boolean(row.verified),
    updatedAt: row.updated_at || null
  };
}

function resolveRateForMonth(rateHistory, month, fallbackRate) {
  const sorted = [...rateHistory]
    .filter((item) => isValidMonth(item.month) && Number.isFinite(item.ratePerKwh))
    .sort((a, b) => a.month.localeCompare(b.month));

  const exact = sorted.find((item) => item.month === month);
  if (exact) {
    return {
      ratePerKwh: exact.ratePerKwh,
      fromMonth: exact.month,
      fallback: false
    };
  }

  const previous = [...sorted].reverse().find((item) => item.month < month);
  if (previous) {
    return {
      ratePerKwh: previous.ratePerKwh,
      fromMonth: previous.month,
      fallback: true
    };
  }

  return {
    ratePerKwh: fallbackRate,
    fromMonth: null,
    fallback: false
  };
}

function normalizeNodeLabels(value) {
  if (!Array.isArray(value)) {
    return DEFAULT_NODE_LABELS;
  }

  return [0, 1, 2].map((index) => {
    const label = value[index];
    if (typeof label !== "string") {
      return DEFAULT_NODE_LABELS[index];
    }
    const cleaned = label.trim();
    return cleaned || DEFAULT_NODE_LABELS[index];
  });
}

function normalizeNodeThresholds(value) {
  if (!Array.isArray(value)) {
    return DEFAULT_NODE_THRESHOLDS;
  }

  return [0, 1, 2].map((index) => {
    const threshold = Number(value[index]);
    return Number.isFinite(threshold) && threshold >= 0
      ? threshold
      : DEFAULT_NODE_THRESHOLDS[index];
  });
}

function mapSettingsRow(row) {
  return {
    electricityRate:
      Number.isFinite(Number(row.electricity_rate))
        ? Number(row.electricity_rate)
        : DEFAULT_SETTINGS.electricityRate,
    effectiveMonth: isValidMonth(row.effective_month)
      ? row.effective_month
      : DEFAULT_SETTINGS.effectiveMonth,
    nodeLabels: normalizeNodeLabels(row.node_labels),
    nodeThresholds: normalizeNodeThresholds(row.node_thresholds),
    timezone:
      typeof row.timezone === "string" && row.timezone.trim().length > 0
        ? row.timezone.trim()
        : DEFAULT_SETTINGS.timezone,
    updatedAt: row.updated_at || null
  };
}

function mapReadingRow(row) {
  return {
    nodeId: row.node_id,
    applianceId: row.appliance_id,
    applianceName: row.appliance_name,
    currentRmsA: Number(row.current_rms_a),
    voltageRefV: Number(row.voltage_ref_v),
    powerW: Number(row.power_w),
    energyWh: row.energy_wh === null ? null : Number(row.energy_wh),
    frequencyHz: row.frequency_hz === null ? null : Number(row.frequency_hz),
    thresholdW: Number(row.threshold_w),
    abnormal: row.abnormal,
    timestamp: row.reading_ts,
    receivedAt: row.received_at
  };
}

class ReadingStore {
  constructor() {
    this.settingsInitPromise = null;
  }

  async ensureSettingsTable() {
    if (!this.settingsInitPromise) {
      this.settingsInitPromise = (async () => {
        await query(`
          CREATE TABLE IF NOT EXISTS app_settings (
            id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            electricity_rate DOUBLE PRECISION NOT NULL DEFAULT 11.5,
            effective_month DATE NOT NULL DEFAULT date_trunc('month', now())::date,
            node_labels JSONB NOT NULL DEFAULT '["Node 1","Node 2","Node 3"]'::jsonb,
            node_thresholds JSONB NOT NULL DEFAULT '[500,800,600]'::jsonb,
            timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await query(`
          CREATE TABLE IF NOT EXISTS monthly_rates (
            month_key TEXT PRIMARY KEY CHECK (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
            rate_per_kwh DOUBLE PRECISION NOT NULL CHECK (rate_per_kwh >= 0),
            source TEXT NOT NULL DEFAULT 'manual',
            source_url TEXT,
            verified BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await query(`
          INSERT INTO app_settings (id)
          VALUES (1)
          ON CONFLICT (id) DO NOTHING
        `);

        await query(`
          INSERT INTO monthly_rates (month_key, rate_per_kwh, source, verified)
          SELECT to_char(effective_month, 'YYYY-MM'), electricity_rate, 'manual', TRUE
          FROM app_settings
          WHERE id = 1
          ON CONFLICT (month_key) DO NOTHING
        `);
      })();
    }

    await this.settingsInitPromise;
  }

  async add(reading) {
    const sql = `
      INSERT INTO readings (
        node_id,
        appliance_id,
        appliance_name,
        current_rms_a,
        voltage_ref_v,
        power_w,
        energy_wh,
        frequency_hz,
        threshold_w,
        abnormal,
        reading_ts
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING
        node_id,
        appliance_id,
        appliance_name,
        current_rms_a,
        voltage_ref_v,
        power_w,
        energy_wh,
        frequency_hz,
        threshold_w,
        abnormal,
        reading_ts,
        received_at
    `;

    const params = [
      reading.nodeId,
      reading.applianceId,
      reading.applianceName,
      reading.currentRmsA,
      reading.voltageRefV,
      reading.powerW,
      reading.energyWh,
      reading.frequencyHz,
      reading.thresholdW,
      reading.abnormal,
      reading.timestamp
    ];

    const result = await query(sql, params);
    return mapReadingRow(result.rows[0]);
  }

  async getReadings({ applianceId, limit }) {
    const hasFilter = Boolean(applianceId);
    const sql = hasFilter
      ? `
          SELECT
            node_id,
            appliance_id,
            appliance_name,
            current_rms_a,
            voltage_ref_v,
            power_w,
            energy_wh,
            frequency_hz,
            threshold_w,
            abnormal,
            reading_ts,
            received_at
          FROM readings
          WHERE appliance_id = $1
          ORDER BY reading_ts DESC
          LIMIT $2
        `
      : `
          SELECT
            node_id,
            appliance_id,
            appliance_name,
            current_rms_a,
            voltage_ref_v,
            power_w,
            energy_wh,
            frequency_hz,
            threshold_w,
            abnormal,
            reading_ts,
            received_at
          FROM readings
          ORDER BY reading_ts DESC
          LIMIT $1
        `;

    const params = hasFilter ? [applianceId, limit] : [limit];
    const result = await query(sql, params);
    return result.rows.map(mapReadingRow);
  }

  async getAlerts(limit) {
    const sql = `
      SELECT
        node_id,
        appliance_id,
        appliance_name,
        current_rms_a,
        voltage_ref_v,
        power_w,
        energy_wh,
        frequency_hz,
        threshold_w,
        abnormal,
        reading_ts,
        received_at
      FROM readings
      WHERE abnormal = TRUE OR power_w > threshold_w
      ORDER BY reading_ts DESC
      LIMIT $1
    `;

    const result = await query(sql, [limit]);
    return result.rows.map(mapReadingRow);
  }

  async getSummary(windowMinutes) {
    const summarySql = `
      SELECT
        appliance_id,
        MAX(appliance_name) AS appliance_name,
        COUNT(*)::int AS sample_count,
        AVG(power_w) AS avg_power_w,
        MIN(power_w) AS min_power_w,
        MAX(power_w) AS max_power_w
      FROM readings
      WHERE reading_ts >= NOW() - ($1::int * INTERVAL '1 minute')
      GROUP BY appliance_id
      ORDER BY appliance_id
    `;

    const countSql = `
      SELECT COUNT(*)::int AS reading_count
      FROM readings
      WHERE reading_ts >= NOW() - ($1::int * INTERVAL '1 minute')
    `;

    const [summaryResult, countResult] = await Promise.all([
      query(summarySql, [windowMinutes]),
      query(countSql, [windowMinutes])
    ]);

    return {
      windowMinutes,
      readingCount: Number(countResult.rows[0]?.reading_count || 0),
      appliances: summaryResult.rows.map((row) => ({
        applianceId: row.appliance_id,
        applianceName: row.appliance_name,
        sampleCount: Number(row.sample_count),
        avgPowerW: Number(row.avg_power_w),
        minPowerW: Number(row.min_power_w),
        maxPowerW: Number(row.max_power_w)
      }))
    };
  }

  async getCount() {
    const sql = `SELECT COUNT(*)::int AS count FROM readings`;
    const result = await query(sql);
    return Number(result.rows[0]?.count || 0);
  }

  async getRateHistory(limit = 240) {
    await this.ensureSettingsTable();
    const safeLimit = Number.isFinite(Number(limit))
      ? Math.min(Math.max(Number(limit), 1), 1000)
      : 240;

    const sql = `
      SELECT
        month_key,
        rate_per_kwh,
        source,
        source_url,
        verified,
        updated_at
      FROM monthly_rates
      ORDER BY month_key DESC
      LIMIT $1
    `;

    const result = await query(sql, [safeLimit]);
    return result.rows.map(normalizeRateRow);
  }

  async upsertMonthlyRate(month, ratePerKwh, options = {}) {
    await this.ensureSettingsTable();
    if (!isValidMonth(month)) {
      throw new Error("month must be in YYYY-MM format");
    }

    if (!Number.isFinite(Number(ratePerKwh)) || Number(ratePerKwh) < 0) {
      throw new Error("ratePerKwh must be a finite number >= 0");
    }

    const source =
      typeof options.source === "string" && options.source.trim().length > 0
        ? options.source.trim()
        : "manual";
    const sourceUrl =
      typeof options.sourceUrl === "string" && options.sourceUrl.trim().length > 0
        ? options.sourceUrl.trim()
        : null;
    const verified = typeof options.verified === "boolean" ? options.verified : true;

    const sql = `
      INSERT INTO monthly_rates (
        month_key,
        rate_per_kwh,
        source,
        source_url,
        verified
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (month_key)
      DO UPDATE SET
        rate_per_kwh = EXCLUDED.rate_per_kwh,
        source = EXCLUDED.source,
        source_url = EXCLUDED.source_url,
        verified = EXCLUDED.verified,
        updated_at = NOW()
      RETURNING
        month_key,
        rate_per_kwh,
        source,
        source_url,
        verified,
        updated_at
    `;

    const result = await query(sql, [month, Number(ratePerKwh), source, sourceUrl, verified]);
    const upserted = normalizeRateRow(result.rows[0]);

    await query(
      `
        UPDATE app_settings
        SET electricity_rate = $2, updated_at = NOW()
        WHERE id = 1 AND to_char(effective_month, 'YYYY-MM') = $1
      `,
      [month, upserted.ratePerKwh]
    );

    return upserted;
  }

  async deleteMonthlyRate(month) {
    await this.ensureSettingsTable();
    if (!isValidMonth(month)) {
      throw new Error("month must be in YYYY-MM format");
    }

    const sql = `
      DELETE FROM monthly_rates
      WHERE month_key = $1
      RETURNING
        month_key,
        rate_per_kwh,
        source,
        source_url,
        verified,
        updated_at
    `;
    const result = await query(sql, [month]);
    return result.rows.length > 0 ? normalizeRateRow(result.rows[0]) : null;
  }

  async getSettings() {
    await this.ensureSettingsTable();

    const [settingsResult, rateHistory] = await Promise.all([
      query(
        `
          SELECT
            electricity_rate,
            to_char(effective_month, 'YYYY-MM') AS effective_month,
            node_labels,
            node_thresholds,
            timezone,
            updated_at
          FROM app_settings
          WHERE id = 1
          LIMIT 1
        `
      ),
      this.getRateHistory(240)
    ]);

    const row = settingsResult.rows[0];
    if (!row) {
      return {
        ...DEFAULT_SETTINGS,
        rateHistory: []
      };
    }

    const mapped = mapSettingsRow(row);
    const resolved = resolveRateForMonth(
      rateHistory,
      mapped.effectiveMonth,
      mapped.electricityRate
    );

    return {
      ...mapped,
      electricityRate: resolved.ratePerKwh,
      rateHistory
    };
  }

  async saveSettings(partialSettings) {
    await this.ensureSettingsTable();
    const current = await this.getSettings();

    const nextSettings = {
      electricityRate:
        Number.isFinite(partialSettings.electricityRate) &&
        partialSettings.electricityRate >= 0
          ? partialSettings.electricityRate
          : current.electricityRate,
      effectiveMonth: isValidMonth(partialSettings.effectiveMonth)
        ? partialSettings.effectiveMonth
        : current.effectiveMonth,
      nodeLabels: Array.isArray(partialSettings.nodeLabels)
        ? normalizeNodeLabels(partialSettings.nodeLabels)
        : current.nodeLabels,
      nodeThresholds: Array.isArray(partialSettings.nodeThresholds)
        ? normalizeNodeThresholds(partialSettings.nodeThresholds)
        : current.nodeThresholds,
      timezone:
        typeof partialSettings.timezone === "string" &&
        partialSettings.timezone.trim().length > 0
          ? partialSettings.timezone.trim()
          : current.timezone
    };

    const sql = `
      UPDATE app_settings
      SET
        electricity_rate = $1,
        effective_month = $2::date,
        node_labels = $3::jsonb,
        node_thresholds = $4::jsonb,
        timezone = $5,
        updated_at = NOW()
      WHERE id = 1
      RETURNING
        electricity_rate,
        to_char(effective_month, 'YYYY-MM') AS effective_month,
        node_labels,
        node_thresholds,
        timezone,
        updated_at
    `;

    const params = [
      nextSettings.electricityRate,
      `${nextSettings.effectiveMonth}-01`,
      JSON.stringify(nextSettings.nodeLabels),
      JSON.stringify(nextSettings.nodeThresholds),
      nextSettings.timezone
    ];

    await query(sql, params);
    await this.upsertMonthlyRate(nextSettings.effectiveMonth, nextSettings.electricityRate, {
      source: "manual",
      verified: true
    });
    return this.getSettings();
  }

  parseRateCandidatesFromText(text) {
    const candidates = [];
    const pattern =
      /(?:₱|PHP\s*)?\s*([0-9]{1,2}(?:\.[0-9]{1,5})?)\s*(?:per|\/)\s*(?:kWh|KWH|kwh)/g;

    let match = pattern.exec(text);
    while (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value >= 0 && value <= 50) {
        candidates.push(value);
      }
      match = pattern.exec(text);
    }

    const uniqueSorted = [...new Set(candidates)].sort((a, b) => a - b);
    return uniqueSorted;
  }

  async fetchRateDraftFromUrl(url, month) {
    await this.ensureSettingsTable();
    if (typeof url !== "string" || url.trim().length === 0) {
      throw new Error("url is required");
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to fetch URL. HTTP ${response.status}`);
    }

    const html = await response.text();
    const candidates = this.parseRateCandidatesFromText(html);
    const rateHistory = await this.getRateHistory(240);

    const monthToUse = isValidMonth(month)
      ? month
      : new Date().toISOString().slice(0, 7);
    const fallback = resolveRateForMonth(
      rateHistory,
      monthToUse,
      DEFAULT_SETTINGS.electricityRate
    );

    let recommendedRate = null;
    if (candidates.length > 0) {
      recommendedRate = candidates.reduce((best, current) => {
        if (best === null) return current;
        return Math.abs(current - fallback.ratePerKwh) < Math.abs(best - fallback.ratePerKwh)
          ? current
          : best;
      }, null);
    }

    return {
      month: monthToUse,
      sourceUrl: url,
      candidates,
      recommendedRate,
      fallbackRate: fallback.ratePerKwh
    };
  }
}

module.exports = { ReadingStore };
