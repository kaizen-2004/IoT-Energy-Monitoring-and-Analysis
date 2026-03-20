const { query } = require("./db");

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
}

module.exports = { ReadingStore };
