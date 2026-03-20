# Detailed Project Plan

This plan follows the 5-phase flow defined in the source document.

## Timeline Model

Suggested baseline: 12 weeks.
- Phase 1: Weeks 1-2
- Phase 2: Weeks 3-5
- Phase 3: Weeks 6-8
- Phase 4: Weeks 9-10
- Phase 5: Weeks 11-12

## Phase 1: System Design and Component Identification

### Objectives
- Finalize hardware/software stack aligned to ESP32 + SCT-013 + web/cloud flow.
- Define architecture, data model, and measurement plan.

### Tasks
1. Confirm component list and specs (voltage/current limits, sensor sensitivity).
2. Define appliance-to-channel mapping and node identifiers.
3. Define sampling strategy and transmission interval.
4. Draft block diagram, flowchart, and data flow sequence.
5. Define calibration and validation protocol.

### Deliverables
- Final architecture diagram.
- Data payload schema.
- Wiring plan and safety checklist.
- Test protocol document.

### Exit Criteria
- All components are compatible and available.
- Architecture and data flow approved.

## Phase 2: Sensor Node Development

### Objectives
- Build and calibrate the sensing node(s).

### Tasks
1. Assemble SCT-013 + burden resistor circuit.
2. Integrate sensor output to ESP32 analog input.
3. Implement ADC sampling and RMS calculation.
4. Implement conversion to power estimate (`P = V x I`).
5. Compare readings against clamp meter/multimeter.
6. Tune calibration constants until stable.

### Deliverables
- Working ESP32 firmware prototype.
- Calibration report per channel.
- Accuracy results and percentage error computation.

### Exit Criteria
- Readings are stable and within accepted error range.
- Firmware reliably samples and computes values.

## Phase 3: Central Monitoring Integration

### Objectives
- Receive, store, and serve sensor data via web-enabled cloud backend.

### Tasks
1. Stand up backend API for ingest and retrieval.
2. Define storage schema for time-series readings.
3. Configure ESP32 network connection and payload formatting.
4. Implement node/device identification and appliance mapping.
5. Validate data delivery reliability and timestamp consistency.

### Deliverables
- Running backend API.
- Database schema and persistence path.
- End-to-end data flow from ESP32 to backend.

### Exit Criteria
- Sensor data appears in backend in near-real time.
- Historical records are queryable by time and appliance.

## Phase 4: Program Development

### Objectives
- Complete firmware and dashboard integration.

### Tasks
1. Finalize firmware for acquisition, computation, and transmission.
2. Implement retry/backoff for network failures.
3. Build dashboard views:
   - Live cards
   - Historical chart
   - Alert panel
4. Implement threshold event generation and display.
5. Add basic usability refinements for household users.

### Deliverables
- Stable firmware build.
- Functional dashboard with real-time and historical views.
- Threshold/abnormal event path operational.

### Exit Criteria
- Users can monitor live and past data remotely via web.
- Alerts trigger on configured abnormal/threshold conditions.

## Phase 5: Optimization and Testing

### Objectives
- Validate performance, reliability, and usability under realistic conditions.

### Tasks
1. Run continuous monitoring tests across selected appliances.
2. Perform abnormal load simulations and verify detection behavior.
3. Measure transmission reliability and dashboard responsiveness.
4. Compute descriptive statistics:
   - Mean
   - Standard deviation
   - Percentage error
5. Apply final firmware/hardware/cloud optimizations.

### Deliverables
- Performance evaluation report.
- Statistical treatment outputs.
- Final optimized prototype and deployment notes.

### Exit Criteria
- System passes defined reliability and usability checks.
- Documentation is complete for defense/deployment.

