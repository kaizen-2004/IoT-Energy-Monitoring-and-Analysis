# Fixed Requirements From Source Document

This file captures non-negotiable requirements extracted from:
`IoT Energy Monitoring and Analysis - Revised.md`.

## Core System Requirements

1. Use non-invasive current sensing with `SCT-013-000`.
2. Use burden resistor-based signal conditioning for sensor output conversion.
3. Use `ESP32` microcontroller with built-in Wi-Fi for data acquisition and transmission.
4. Monitor multiple household appliances.
5. Compute electrical metrics including:
   - Current
   - Voltage reference
   - Power using `P = V x I`
6. Implement RMS current computation and calibration.
7. Validate sensor readings against standard measuring tools (clamp meter or multimeter).
8. Transmit data wirelessly over Wi-Fi to a cloud-based platform.
9. Build a web-based dashboard with:
   - Real-time readings
   - Historical data
   - Graph visualization
10. Support threshold-based notifications and abnormal consumption detection.
11. Evaluate system performance using:
   - Mean
   - Standard deviation
   - Percentage error
   - Transmission reliability
   - Dashboard responsiveness

## Research/Testing Context Requirements

1. Development and testing occur in:
   - Controlled lab/home workspace
   - Actual residential environment
2. Typical appliance test set includes examples like:
   - Electric fan
   - Rice cooker
   - Television
   - Refrigerator (mentioned in context)
3. System must be practical, low-cost, and accessible for household use.

## Required Implementation Phases

1. System Design and Component Identification
2. Sensor Node Development
3. Central Monitoring Integration
4. Program Development
5. Optimization and Testing

