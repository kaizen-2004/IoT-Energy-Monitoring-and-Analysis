-- Appliances catalog
CREATE TABLE IF NOT EXISTS appliances (
  appliance_id TEXT PRIMARY KEY,
  appliance_name TEXT NOT NULL,
  node_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time-series readings
CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  node_id TEXT NOT NULL,
  appliance_id TEXT NOT NULL,
  appliance_name TEXT NOT NULL,
  current_rms_a DOUBLE PRECISION NOT NULL,
  voltage_ref_v DOUBLE PRECISION NOT NULL,
  power_w DOUBLE PRECISION NOT NULL,
  energy_wh DOUBLE PRECISION,
  frequency_hz DOUBLE PRECISION,
  threshold_w DOUBLE PRECISION NOT NULL,
  abnormal BOOLEAN NOT NULL DEFAULT FALSE,
  reading_ts TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_appliance_ts
  ON readings (appliance_id, reading_ts DESC);

CREATE INDEX IF NOT EXISTS idx_readings_node_ts
  ON readings (node_id, reading_ts DESC);

CREATE INDEX IF NOT EXISTS idx_readings_alerts_ts
  ON readings (abnormal, reading_ts DESC);

-- Optional materialized view for fast summary queries
-- CREATE MATERIALIZED VIEW appliance_hourly_summary AS
-- SELECT
--   appliance_id,
--   date_trunc('hour', reading_ts) AS hour_bucket,
--   AVG(power_w) AS avg_power_w,
--   MIN(power_w) AS min_power_w,
--   MAX(power_w) AS max_power_w,
--   COUNT(*) AS sample_count
-- FROM readings
-- GROUP BY appliance_id, date_trunc('hour', reading_ts);

