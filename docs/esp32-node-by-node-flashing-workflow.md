# ESP32 Node-by-Node Flashing Workflow

This project uses:

- 3 separate ESP32 nodes
- 1 appliance per node
- 1 shared firmware sketch
- 1 node-specific config per board

## Hardware Mapping

- `node-01` -> `appliance-01`
- `node-02` -> `appliance-02`
- `node-03` -> `appliance-03`

## Firmware Structure

Use the same firmware sketch for all 3 nodes:

- `firmware/esp32/esp32_energy_monitor.ino`

Use the node-specific config templates:

- `firmware/esp32/config.node-01.example.h`
- `firmware/esp32/config.node-02.example.h`
- `firmware/esp32/config.node-03.example.h`

Use the helper script to generate `config.h` for the node you are about to flash:

- `firmware/esp32/use_node_config.sh`

## Before You Start

1. Open the folder:
   - `firmware/esp32`

2. Prepare:
   - Arduino IDE
   - ESP32 board package
   - USB cable
   - Wi-Fi SSID
   - Wi-Fi password
   - backend API URL if different from the template

3. Identify which physical board will be:
   - Node 1
   - Node 2
   - Node 3

4. Label each board after flashing to avoid confusion.

## Node 1 Flashing

1. Generate the Node 1 config:

```bash
./use_node_config.sh node-01
```

2. Open `config.h`

3. Set or confirm:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `API_ENDPOINT`
   - `NODE_ID = "node-01"`
   - `APPLIANCE_IDS = {"appliance-01"}`

4. Open:
   - `esp32_energy_monitor.ino`

5. Connect the ESP32 board for appliance 1.

6. In Arduino IDE:
   - select the correct ESP32 board
   - select the correct serial port

7. Upload the firmware.

8. Open Serial Monitor.

9. Confirm the device connects and starts sending readings.

10. Label the board:
   - `node-01`
   - appliance 1 name

## Node 2 Flashing

1. Generate the Node 2 config:

```bash
./use_node_config.sh node-02
```

2. Open `config.h`

3. Set or confirm:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `API_ENDPOINT`
   - `NODE_ID = "node-02"`
   - `APPLIANCE_IDS = {"appliance-02"}`

4. Connect the ESP32 board for appliance 2.

5. In Arduino IDE:
   - confirm the correct serial port

6. Upload the same firmware sketch:
   - `esp32_energy_monitor.ino`

7. Open Serial Monitor.

8. Confirm the device connects and sends readings.

9. Label the board:
   - `node-02`
   - appliance 2 name

## Node 3 Flashing

1. Generate the Node 3 config:

```bash
./use_node_config.sh node-03
```

2. Open `config.h`

3. Set or confirm:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `API_ENDPOINT`
   - `NODE_ID = "node-03"`
   - `APPLIANCE_IDS = {"appliance-03"}`

4. Connect the ESP32 board for appliance 3.

5. Upload the same firmware sketch:
   - `esp32_energy_monitor.ino`

6. Open Serial Monitor.

7. Confirm the device connects and sends readings.

8. Label the board:
   - `node-03`
   - appliance 3 name

## Validation After Flashing All 3 Nodes

Check that the backend receives readings for:

- `appliance-01`
- `appliance-02`
- `appliance-03`

Useful endpoints:

- `GET /health`
- `GET /health/db`
- `GET /api/readings?limit=20`

Check that:

- Node 1 sends only `appliance-01`
- Node 2 sends only `appliance-02`
- Node 3 sends only `appliance-03`

In the dashboard, confirm:

- all 3 devices appear
- combined threshold status works as expected

## Important Notes

- `config.h` is overwritten each time you run `use_node_config.sh`
- Always flash immediately after generating the correct node config
- Do not use the old multi-channel setup path for this project
- This project is intended for:
  - 3 separate ESP32 nodes
  - 1 appliance per node
