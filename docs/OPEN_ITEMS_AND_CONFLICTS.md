# Open Items and Source Conflicts

This file documents ambiguities/conflicts in the source document and a recommended alignment path without changing core intent.

## 1. ESP32/Wi-Fi vs Arduino Nano/NRF24

### Observed
- Core sections repeatedly specify ESP32 with Wi-Fi and cloud/web transmission.
- Matrix rows mention Arduino Nano and NRF24L01.

### Recommended Alignment
- Treat **ESP32 + Wi-Fi** as canonical architecture.
- Keep Arduino/NRF24 references as legacy draft artifacts unless advisers explicitly require dual-path comparison.

## 2. Multiple Sensor Nodes vs Single ESP32 Quantity

### Observed
- Objective states multiple wireless sensor nodes.
- Materials list includes one ESP32.

### Recommended Alignment
- Start with one ESP32 with multiple channels as prototype baseline.
- If strict multi-node requirement is enforced, add additional ESP32 nodes and assign per-zone or per-appliance.

## 3. Voltage and Frequency Constants

### Observed
- Mains voltage and frequency are referenced but fixed values are not formally declared.

### Recommended Alignment
- Declare configurable constants in firmware:
  - `VOLTAGE_REF_V` (e.g., 220/230V by local standard)
  - `FREQUENCY_HZ` (e.g., 50/60Hz)
- Record values used during experiments for reproducibility.

## 4. Threshold and Abnormal Logic Criteria

### Observed
- Threshold notifications and abnormal detection are required, but exact formulas are not fully specified.

### Recommended Alignment
- Required baseline:
  - Fixed per-appliance power thresholds.
- Optional enhancement:
  - Rolling baseline + deviation scoring.
- Report both methods if used.

## 5. Offline/Internet Dependency Narrative

### Observed
- Introduction emphasizes reduced dependence on constant internet.
- Core implementation still uses cloud/web dashboard via Wi-Fi/internet.

### Recommended Alignment
- Keep cloud dashboard as required.
- Add local buffering and delayed sync as resilience feature to partially satisfy low-connectivity intent.

