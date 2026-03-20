# ESP32 Firmware Starter

This folder contains a starter Arduino sketch for:
- SCT-013 current sampling
- RMS current estimation
- Power estimation (`P = V x I`)
- Wi-Fi transmission to backend API

## Files

- `esp32_energy_monitor.ino` -> Main firmware starter.
- `config.example.h` -> Copy to `config.h` and edit values.

## Setup

1. Copy config:
```bash
cp config.example.h config.h
```

2. Edit:
- Wi-Fi SSID/password
- API endpoint URL
- Node/appliance IDs
- Calibration constants and thresholds

3. Open `esp32_energy_monitor.ino` in Arduino IDE.
4. Select ESP32 board and upload.

## Notes

- Calibration values in this starter are placeholders.
- Validate readings against clamp meter before trusting data.
- Keep sensor wiring isolated and safe for AC environments.

