// ============================================================
//  config.h — User-specific settings for Launcher Ground Station
// ============================================================
//  Edit these values before flashing.
// ============================================================

#ifndef CONFIG_H
#define CONFIG_H

// --- WiFi Access Point ---
// The launcher creates its own WiFi network (SoftAP mode).
// The dashboard PC and rocket connect to this network.
const char* WIFI_SSID     = "ROCKET_LAUNCHER";
const char* WIFI_PASSWORD = "change_me";

// --- UDP Communication ---
// Port used for telemetry exchange with the dashboard
const int UDP_PORT = 4444;

#endif // CONFIG_H
