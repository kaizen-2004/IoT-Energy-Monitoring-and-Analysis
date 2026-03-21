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

-- Shared dashboard/app settings (single row)
CREATE TABLE IF NOT EXISTS app_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  electricity_rate DOUBLE PRECISION NOT NULL DEFAULT 11.5,
  effective_month DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  node_labels JSONB NOT NULL DEFAULT '["Node 1","Node 2","Node 3"]'::jsonb,
  node_thresholds JSONB NOT NULL DEFAULT '[500,800,600]'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Historical monthly electricity rates (PHP per kWh)
CREATE TABLE IF NOT EXISTS monthly_rates (
  month_key TEXT PRIMARY KEY CHECK (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  rate_per_kwh DOUBLE PRECISION NOT NULL CHECK (rate_per_kwh >= 0),
  source TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO monthly_rates (month_key, rate_per_kwh, source, verified)
SELECT to_char(effective_month, 'YYYY-MM'), electricity_rate, 'manual', TRUE
FROM app_settings
WHERE id = 1
ON CONFLICT (month_key) DO NOTHING;

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
