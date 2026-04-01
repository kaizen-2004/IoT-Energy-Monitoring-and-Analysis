# Implementation Checklist

Use this as the execution tracker while building.

## Phase 1: Design and Component Identification

- [ ] Confirm ESP32 pin assignments for each SCT-013 channel.
- [ ] Confirm burden resistor values and target ADC voltage range.
- [ ] Define node/appliance naming convention.
- [ ] Define payload schema and transmission interval.
- [ ] Draft architecture/block/data-flow diagrams.
- [ ] Draft calibration and validation procedure.

## Phase 2: Sensor Node Development

- [ ] Build channel 1 sensing circuit and validate waveform.
- [ ] Build channel 2 sensing circuit and validate waveform.
- [ ] Build channel 3 sensing circuit and validate waveform.
- [ ] Implement firmware ADC sampling loop.
- [ ] Implement RMS current computation.
- [ ] Implement `P = V x I` computation.
- [ ] Add per-channel calibration factors.
- [ ] Compare against clamp meter and log error.
- [ ] Tune calibration until stable values are achieved.

## Phase 3: Central Monitoring Integration

- [x] Stand up backend ingestion endpoint.
- [x] Implement input validation and timestamp handling.
- [x] Add data storage model for readings and alerts.
- [x] Add query endpoints for dashboard views.
- [x] Validate end-to-end device -> API -> storage path.
- [x] Verify stable Wi-Fi transmission over extended runs.

## Phase 4: Program and Dashboard Development

- [] Finalize firmware reconnection logic.
- [ ] Add threshold-based abnormal flagging logic.
- [x] Build dashboard real-time metric cards.
- [x] Build historical line chart view.
- [x] Build alert list for threshold/abnormal events.
- [x] Add mobile-friendly layout.
- [ ] Validate multi-appliance filtering/display.

## Phase 5: Optimization, Testing, and Analysis

- [ ] Run structured tests for electric fan.
- [ ] Run structured tests for rice cooker.
- [ ] Run structured tests for television.
- [ ] Simulate abnormal consumption patterns.
- [ ] Compute mean for each measured variable.
- [ ] Compute standard deviation for consistency.
- [ ] Compute percentage error vs reference meter.
- [ ] Measure API/delivery success rate.
- [ ] Measure dashboard refresh latency.
- [ ] Apply final optimization and freeze release candidate.

## Documentation and Reporting

- [ ] Capture wiring photos and final wiring diagram.
- [ ] Record firmware version and calibration constants.
- [ ] Export sample datasets and charts.
- [ ] Finalize methodology, results, and analysis narrative.
