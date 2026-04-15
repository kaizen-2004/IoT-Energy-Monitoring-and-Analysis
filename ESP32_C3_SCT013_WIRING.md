# ESP32-C3 Super Mini + SCT-013 Wiring

This project uses an `ESP32-C3 Super Mini` and an `SCT-013-000 30A` current transformer.

## Parts

- `ESP32-C3 Super Mini`
- `SCT-013-000 30A`
- `2 x 10k` resistors
- `1 x 22 ohm` burden resistor
- `1 x 10uF` electrolytic capacitor (`10V` or higher)

## Firmware Pin

Node 1 uses:

- `GPIO0` as the ADC input

## Wiring Summary

Create two important nodes:

1. `Node A` = bias midpoint
2. `Node B` = ADC node

### Node A connections

Connect all of these together:

- `3V3 -> 10k resistor -> Node A`
- `Node A -> 10k resistor -> GND`
- `SCT red -> Node A`
- `22 ohm burden resistor side 1 -> Node A`
- `10uF capacitor positive (+) -> Node A`

### Node B connections

Connect all of these together:

- `GPIO0 -> Node B`
- `SCT black -> Node B`
- `22 ohm burden resistor side 2 -> Node B`

### Capacitor connection

- `10uF capacitor positive (+) -> Node A`
- `10uF capacitor negative (-) -> GND`

## ASCII Diagram

```text
ESP32-C3 3V3 ----[10k]---- Node A ----[10k]---- ESP32-C3 GND
                             |   \
                             |    \
                             |     +---- SCT red
                             |
                             +---- (+) 10uF capacitor (-) ---- GND
                             |
                             +----[22R]---- Node B ---- GPIO0
                                            |
                                            +---- SCT black
```

## Important Notes

- The `22 ohm` burden resistor must be **across the SCT leads**.
- Do **not** connect the burden resistor directly to `GND`.
- Do **not** connect `SCT black` directly to `GND`.
- Do **not** connect `SCT red` directly to `3V3`.
- Clamp the SCT around the **live wire only**.
- Do not clamp both live and neutral together.

## Expected Idle Check

With the clamp not around any wire:

- `Node A` to `GND` should be about `1.65V`
- `GPIO0 / Node B` to `GND` should also be near `1.65V`
- Serial output should be near `0A` and `0W`

## Node Mapping

For this project:

- `node-01` -> `GPIO0` -> `appliance-01`
- `node-02` -> same circuit pattern, different node config
- `node-03` -> same circuit pattern, different node config

## Safety

- Never connect mains AC directly to the ESP32.
- Only the CT clamp should go around the appliance conductor.
- Keep low-voltage wiring isolated from mains.
- Validate readings against a known load when calibrating.
