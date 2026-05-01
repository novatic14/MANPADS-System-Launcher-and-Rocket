# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Proof-of-concept guided rocket and launcher prototype using consumer ESP32 microcontrollers, 3D-printed parts, and a Python ground control dashboard. Three cooperating components form the full system.

## Build & Flash (PlatformIO)

Both firmware components are PlatformIO projects under `Firmware/Rocket/` and `Firmware/Launcher/`.

```bash
# Build and flash the rocket flight computer
cd Firmware/Rocket
pio run -e rocket -t upload

# Build and flash the launcher ground station
cd Firmware/Launcher
pio run -e launcher -t upload

# Monitor serial output (both projects)
pio device monitor -b 115200
```

## Run the Dashboard

```bash
cd Firmware
pip install -r requirements.txt          # first time only
# On Debian/Ubuntu, also: sudo apt install python3-tk
python dashboard.py
```

The dashboard connects to the launcher's WiFi AP (`ROCKET_LAUNCHER` / `launch_secure`) at 192.168.4.1 via UDP port 4444.

## System Architecture

### Three-Component Chain

```
[Python Dashboard] <--UDP 4444--> [Launcher ESP32] <--UART Serial2 115200--> [Rocket ESP32]
```

**Rocket (`Firmware/Rocket/src/main.cpp`)** — flight computer:
- Reads MPU6050 (I2C SDA=21, SCL=22) for gyro rate and accelerometer data
- Runs a PD stabilization loop (`output = Kp*roll + Kd*rate`) at every loop iteration
- Drives 4 canard servos (GPIO 14/25/26/27) and ignition servo (GPIO 5) via ESP32Servo
- State machine: `IDLE → ARMED → IGNITING → FLIGHT`
- Sends `DATA,ax,ay,az,roll,rate,servo_offset,state,Kp,Kd,skew` and `READY` over Serial2
- Accepts `ARM`, `IGNITE`, `CALIBRATE`, `PID,Kp,Kd` commands from Serial2

**Launcher (`Firmware/Launcher/src/main.cpp`)** — ground station relay:
- Hosts a WiFi SoftAP and listens for the Python dashboard on UDP 4444
- State machine: `SAFE → ARMING → READY → IGNITING`; controlled by physical arm switch (GPIO 5) and launch button (GPIO 18)
- Reads GPS (HardwareSerial1, GPIO 4), QMC5883L compass, and BMP180 barometer over shared I2C (SDA=21, SCL=22)
- Relays rocket telemetry to the dashboard as `T,...` and `STATUS:...` UDP packets
- Sends `ENV,lat,lon,alt,gpsState` to dashboard every 1 s
- Forwards `launch`, `calibrate`, and `PID,...` commands from the dashboard to the rocket via Serial2
- Blocks at startup if no GPS NMEA data is detected within 5 s

**Dashboard (`Firmware/dashboard.py`)** — ground control UI:
- Tkinter app with live matplotlib telemetry chart (roll angle + rate, servo output fill)
- UDP listener thread receives `T,`, `STATUS:`, `ENV,`, and `[FUSION]` messages from the launcher
- Watchdog thread pings `HELLO` to 192.168.4.1 every 2 s to keep dashboard IP registered
- Provides CALIBRATE GYRO, DIGITAL LAUNCH, and PID upload buttons
- GPS status indicator: red=no NMEA, orange=searching, green=fix

### UDP Telemetry Protocol

| Direction | Format | Description |
|-----------|--------|-------------|
| Rocket → Dashboard | `T,<ms>,<roll>,<rate>,<servo_out>` | 20 Hz telemetry |
| Rocket → Dashboard | `STATUS:<state>,<Kp>,<Kd>,<skew>` | State + PID echo |
| Launcher → Dashboard | `ENV,<lat>,<lon>,<alt>,<gpsState>` | Environment + GPS (1 Hz) |
| Dashboard → Rocket | `launch` | Triggers ignition |
| Dashboard → Rocket | `calibrate` | Zeros gyro offset |
| Dashboard → Rocket | `PID,<Kp>,<Kd>` | Updates PID gains |

### Calibration Files

`Firmware/Calibration & Test Code/` contains standalone `.ino` sketches for:
- `fin_calibration.ino` — servo center angle tuning
- `i2c_scanner.ino` — I2C address discovery
- `roll_stabilization.ino` — isolated stabilization loop testing

These are not part of the PlatformIO build; upload them via Arduino IDE directly.

### Key Constants to Know

Rocket servo center angles (hardcoded, trim via `fin_calibration.ino`):
- Left: 115°, Right: 80°, Up: 80°, Down: 115°, Max deflection: ±12°

Compass hard-iron calibration offsets in launcher firmware (`MAG_OFFSET_X/Y/Z`, `MAG_SCALE_X/Y/Z`) are hardware-specific and must be re-calibrated if the compass is moved.

> **Note:** Pin assignments in `docs/WIRING.md` were reverse-engineered and may not exactly match the current firmware. Treat the `.cpp` source files as authoritative.
