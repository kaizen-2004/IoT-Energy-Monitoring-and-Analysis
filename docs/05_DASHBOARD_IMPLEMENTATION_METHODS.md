# Dashboard Implementation Methods

All options below preserve required features:
- Real-time monitoring
- Historical data display
- Graph visualization
- Cloud-backed storage and access

## Option A: Custom Web App (Recommended for Thesis Control)

### Stack
- Frontend: HTML/CSS/JavaScript + Chart.js
- Backend: Node.js/Express API
- Storage: SQL/PostgreSQL (or managed equivalent)

### Why It Fits
- Closely matches source requirements (HTML/CSS/JS explicitly listed).
- High flexibility for custom research metrics and UI behavior.
- Easier to demonstrate internal logic during defense.

### Tradeoff
- More coding effort than managed low-code platforms.

## Option B: Firebase-Centered Dashboard

### Stack
- Frontend: HTML/CSS/JavaScript
- Data: Firebase Realtime Database or Firestore
- Hosting/Auth: Firebase services

### Why It Fits
- Fast real-time sync.
- Simplified deployment and remote access.

### Tradeoff
- Vendor lock-in and pricing model dependencies.

## Option C: InfluxDB + Grafana (Analytics-Heavy)

### Stack
- Data ingestion API
- InfluxDB for time-series storage
- Grafana dashboards

### Why It Fits
- Strong historical analysis and graphing out of the box.
- Excellent for long-duration trend studies.

### Tradeoff
- Less custom UX for household users unless additional frontend is built.

## Recommended Method For This Project

Choose **Option A** first:
1. It best matches the document's software direction.
2. It gives full control of feature-by-feature requirement mapping.
3. It can later integrate Firebase/Influx if scaling is needed.

## Required Dashboard Views

1. **Real-Time Panel**
   - Current (A), voltage reference (V), power (W), status.
2. **Historical Trends**
   - Time-series chart by appliance.
3. **Appliance Filter**
   - Switch between fan/rice cooker/TV/others.
4. **Alerts Panel**
   - Threshold exceedance and abnormal behavior flags.
5. **Reliability Indicators**
   - Last update time and connectivity status.

