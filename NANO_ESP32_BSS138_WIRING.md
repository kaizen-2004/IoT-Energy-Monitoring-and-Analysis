# Arduino Nano + BSS138 + ESP32-C3 Wiring Guide

## Overview
- Arduino Nano reads SCT-013 sensor
- Sends power readings to ESP32-C3 via serial
- BSS138 level shifter converts 5V to 3.3V

## Connection Diagram

```
┌─────────────────┐          ┌─────────────┐          ┌────────────────┐
│   Arduino Nano  │          │   BSS138    │          │   ESP32-C3     │
│                 │          │ (4-channel) │          │  (Super Mini)  │
│  SCT-013 on A0  │          │             │          │                │
│     (analog)    │          │             │          │                │
│                 │          │             │          │                │
│    TX (D1) ─────┼──────────┼─── HV1 ─────┼──────────┼──── GPIO 5 (RX) │
│                 │          │             │          │                │
│    RX (D0) ─────┼──────────┼─── HV2 ◄───┼──────────┼──── GPIO 4 (TX)│
│                 │          │             │          │                │
│             5V ─┼──────────┼─── HV       │          │                │
│             GND ─┼─────────┼─── GND     │          │                │
│                 │          │             │          │      3.3V ────┼──── VCC
│                 │          │    LV ───────┼──────────┼───── GND        │          │ GND
└─────────────────┘          └─────────────┘          └────────────────┘
```

## Detailed Pin Connections

### Arduino Nano Pins
| Nano Pin | Function | Connect To |
|---------|----------|-----------|
| A0 | SCT-013 signal | SCT-013 yellow wire |
| D1 (TX) | Serial output | BSS138 HV1 |
| D0 (RX) | Serial input | BSS138 HV2 (optional) |
| 5V | Power | BSS138 HV |
| GND | Ground | BSS138 GND |

### BSS138 Level Shifter Pins
| BSS138 Pin | Connect To |
|-----------|-----------|
| HV | Arduino Nano 5V |
| GND | Arduino Nano GND |
| HV1 | Arduino Nano TX (D1) → ESP32 GPIO5 |
| HV2 | ESP32 GPIO4 → Arduino Nano RX (D0) {optional} |
| LV | ESP32-C3 3.3V |
| GND | ESP32-C3 GND (common ground) |

### ESP32-C3 Pins (Super Mini)
| ESP32 Pin | Function | Connect To |
|-----------|----------|-----------|
| GPIO5 | U1RX | BSS138 HV1 |
| GPIO4 | U1TX | BSS138 HV2 {optional} |
| 3V3 | Power | BSS138 LV |
| GND | Ground | BSS138 GND |

## Important Notes

1. **Common Ground**: Must connect both GNDs together (Nano GND and ESP32 GND)

2. **Level Shifter Direction**: 
   - HV side = 5V (Nano side)
   - LV side = 3.3V (ESP32 side)

3. **BSS138 Wiring**:
   - HV ↔ 5V (from Nano)
   - LV ↔ 3.3V (from ESP32)
   - GND ↔ GND (both sides)
   - HV1: Nano TX → ESP32 RX
   - HV2: ESP32 TX → Nano RX (optional)

4. **Quick Test**: If serial communication fails:
   - Check common ground is connected
   - Verify BSS138 has 5V on HV and 3.3V on LV
   - Try swapping TX/RX connections

## Power
- Nano: Powered from USB or 5V supply
- ESP32-C3: Powered from USB or 5V via regulator
- BSS138: Powered from both 5V and 3.3V sides