-- Realistic sample readings for March 2026.
-- Inserts 30-minute readings for three appliances using stable usage patterns.

WITH series AS (
  SELECT generate_series(
    TIMESTAMPTZ '2026-03-01 00:00:00+08',
    TIMESTAMPTZ '2026-03-31 23:30:00+08',
    INTERVAL '30 minutes'
  ) AS reading_ts
),
refrigerator AS (
  SELECT
    'node-01'::text AS node_id,
    'appliance-01'::text AS appliance_id,
    'Refrigerator'::text AS appliance_name,
    230.0::double precision AS voltage_ref_v,
    CASE
      WHEN EXTRACT(HOUR FROM reading_ts) IN (3, 15) AND EXTRACT(MINUTE FROM reading_ts) = 0
        THEN 220 + random() * 30
      WHEN EXTRACT(MINUTE FROM reading_ts) = 0
        THEN 85 + random() * 35
      ELSE 110 + random() * 55
    END AS power_w,
    60.0::double precision AS frequency_hz,
    500.0::double precision AS threshold_w,
    reading_ts
  FROM series
),
airconditioner AS (
  SELECT
    'node-02'::text AS node_id,
    'appliance-02'::text AS appliance_id,
    'Airconditioner'::text AS appliance_name,
    230.0::double precision AS voltage_ref_v,
    CASE
      WHEN EXTRACT(ISODOW FROM reading_ts) IN (6, 7)
        AND EXTRACT(HOUR FROM reading_ts) BETWEEN 13 AND 17
        THEN 520 + random() * 180
      WHEN EXTRACT(HOUR FROM reading_ts) >= 18 OR EXTRACT(HOUR FROM reading_ts) <= 5
        THEN 720 + random() * 220
      ELSE 0 + random() * 18
    END AS power_w,
    60.0::double precision AS frequency_hz,
    800.0::double precision AS threshold_w,
    reading_ts
  FROM series
),
television AS (
  SELECT
    'node-03'::text AS node_id,
    'appliance-03'::text AS appliance_id,
    'Television'::text AS appliance_name,
    230.0::double precision AS voltage_ref_v,
    CASE
      WHEN EXTRACT(ISODOW FROM reading_ts) IN (6, 7)
        AND EXTRACT(HOUR FROM reading_ts) BETWEEN 14 AND 17
        THEN 70 + random() * 45
      WHEN EXTRACT(HOUR FROM reading_ts) BETWEEN 19 AND 23
        THEN 95 + random() * 55
      ELSE 0 + random() * 6
    END AS power_w,
    60.0::double precision AS frequency_hz,
    600.0::double precision AS threshold_w,
    reading_ts
  FROM series
),
all_readings AS (
  SELECT * FROM refrigerator
  UNION ALL
  SELECT * FROM airconditioner
  UNION ALL
  SELECT * FROM television
)
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
)
SELECT
  node_id,
  appliance_id,
  appliance_name,
  ROUND((power_w / voltage_ref_v)::numeric, 4)::double precision AS current_rms_a,
  voltage_ref_v,
  ROUND(power_w::numeric, 2)::double precision AS power_w,
  NULL::double precision AS energy_wh,
  frequency_hz,
  threshold_w,
  power_w > threshold_w AS abnormal,
  reading_ts
FROM all_readings
ORDER BY reading_ts, appliance_id;
