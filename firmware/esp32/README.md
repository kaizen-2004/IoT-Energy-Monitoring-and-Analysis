# ESP32 Firmware Starter

This folder contains a starter Arduino sketch for:
- SCT-013 current sampling
- RMS current estimation
- Power estimation (`P = V x I`)
- Wi-Fi transmission to backend API

## Files

- `esp32_energy_monitor.ino` -> Main firmware starter.
- `config.example.h` -> Copy to `config.h` and edit values.
- `config.node-01.example.h` -> Template for ESP32 Node 1.
- `config.node-02.example.h` -> Template for ESP32 Node 2.
- `config.node-03.example.h` -> Template for ESP32 Node 3.
- `use_node_config.sh` -> Helper script to switch `config.h` by node.

## Setup

1. Create config:
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

## Prepare Now (No ESP32 Yet)

You can preconfigure node identities now so flashing later is fast.

1. Switch to a node template:
```bash
cd firmware/esp32
./use_node_config.sh node-01
```

2. Edit `config.h` and set:
- `WIFI_SSID`
- `WIFI_PASSWORD`

3. Repeat for each node:
```bash
./use_node_config.sh node-02
./use_node_config.sh node-03
```

Recommended mapping:
- `node-01` -> `appliance-01` -> `"Node 1"`
- `node-02` -> `appliance-02` -> `"Node 2"`
- `node-03` -> `appliance-03` -> `"Node 3"`

All templates already point to:
- `API_ENDPOINT = "https://iot-energy-monitor-api.onrender.com/api/readings"`

## Notes

- Calibration values in this starter are placeholders.
- Validate readings against clamp meter before trusting data.
- Keep sensor wiring isolated and safe for AC environments.
