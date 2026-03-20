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
          INSERT INTO app_settings (id)
          VALUES (1)
          ON CONFLICT (id) DO NOTHING
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

  async getSettings() {
    await this.ensureSettingsTable();

    const sql = `
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
    `;

    const result = await query(sql);
    const row = result.rows[0];
    if (!row) {
      return DEFAULT_SETTINGS;
    }

    return mapSettingsRow(row);
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

    const result = await query(sql, params);
    return mapSettingsRow(result.rows[0]);
  }
}

module.exports = { ReadingStore };
