# ==============================================================
#  config.py — User-specific settings for Rocket Telemetry Dashboard
# ==============================================================
#  Edit these values to match your launcher's WiFi configuration.
# ==============================================================

# --- UDP Listener ---
# IP to bind the listener to (0.0.0.0 = all interfaces)
UDP_IP = "0.0.0.0"

# UDP port — must match the launcher firmware's UDP_PORT
UDP_PORT = 4444

# --- Launcher Connection ---
# The launcher's IP address on its SoftAP network
# Default is 192.168.4.1 (ESP32 SoftAP default gateway)
LAUNCHER_GATEWAY = "192.168.4.1"
