  PROJECT TITLE
  IoT-Based Household Energy Monitoring Dashboard

  PROJECT SUMMARY
  This project monitors power consumption of 3 appliance
  nodes using ESP32 + SCT-013 current sensors.
  Data flow:
  ESP32 nodes -> Wi-Fi -> Render API -> Supabase Postgres ->
  Web Dashboard.
  Primary dashboard unit is kWh, with optional estimated PHP
  cost based on manually entered monthly rate (PHP/kWh).
  Timezone basis is PHT (UTC+8).

  CORE GOALS
  1. Show total household energy consumption in kWh.
  2. Show per-node energy consumption (3 nodes) in kWh.
  3. Visualize each node’s energy trend over time using a
  line chart.
  4. Show dynamic insight:
     “You have consumed more/less kWh today compared to
  yesterday.”
  5. Allow monthly electricity rate input in Settings.
  6. Export report to PDF including charts and summary
  values.

  INFORMATION ARCHITECTURE
  Main navigation (top or left rail):
  1. Dashboard
  2. Settings
  3. Reports (optional, can be merged into Settings if
  preferred)

  SCREEN 1: DASHBOARD
  Sections:
  1. Header
     - Title: Household Energy Dashboard
     - Subtitle: Philippine context, unit kWh, timezone PHT
     - Connection status badge
     - Last updated time

  2. Quick Controls
     - Refresh interval input
     - Apply button
     - Data source label/API endpoint display

  3. KPI Cards
     - Total Consumption Today (kWh)
     - Yesterday Consumption (kWh)
     - Estimated Cost Today (PHP) based on current rate
     - Insight card: more/less vs yesterday

  4. Node Cards (3 cards)
     - Node 1, Node 2, Node 3
     - Appliance label
     - kWh today
     - Latest power (W)
     - Estimated cost today (PHP)
     - Device ID

  5. Trend Chart
     - Multi-line chart, one line per node
     - Last 7 days (PHT)
     - Y-axis: kWh
     - X-axis: day labels

  6. Optional Alerts Panel
     - Threshold exceedance logs
     - Timestamp + node + value

  SCREEN 2: SETTINGS
  Sections:
  1. Billing Settings
     - Monthly Rate (PHP/kWh) input
     - Effective Month selector
     - Currency label (PHP)
     - Save button

  2. Node Settings
     - Rename Node 1/2/3 labels
     - Optional appliance mapping
     - Optional threshold per node (W)
     - Save button

  3. Insight Settings
     - Comparison window (Today vs Yesterday fixed default)
     - Timezone selector (default Asia/Manila)

  4. Export Settings
     - Date range picker
     - Include charts toggle
     - Include node table toggle
     - Include alerts toggle
     - Generate PDF button

  PDF EXPORT CONTENT
  1. Title page (project name, date generated, timezone,
  selected rate PHP/kWh)
  2. Summary page (total kWh, per-node kWh, estimated PHP
  totals)
  3. Trend charts page
  4. Node details table (node, kWh, avg power, cost)
  5. Alerts/events table (if enabled)
  6. Footer: generated timestamp and data source

  CALCULATION RULES
  1. Interval energy:
     kWh_interval = ((P_prev + P_curr) / 2) * delta_hours /
  1000
  2. Daily node kWh:
     sum(kWh_interval per node per day)
  3. Total daily kWh:
     node1 + node2 + node3
  4. Estimated cost:
     kWh * rate_per_kWh
  5. Insight:
     compare today_kWh vs yesterday_kWh and show more/less/
  same message
     - Mobile: stacked cards and full-width chart

  TECH/IMPLEMENTATION NOTES
  1. Current backend endpoints:
     /health
     /api/summary
  2. Rate input should persist locally (localStorage) and
  optionally in backend user settings later.
  3. PDF export can start with client-side generation
  (html2canvas + jsPDF), then upgrade to server-side
  rendering if needed.

  SUCCESS CRITERIA
  1. User can understand total and per-node usage within 5
  seconds.
  2. User can change monthly rate and instantly see updated
  estimated costs.
  3. Insight message updates correctly after new data
  arrives.
  4. PDF export includes chart + summary + selected date
  range and is presentation-ready.

Strictly html, css, and javascript only
