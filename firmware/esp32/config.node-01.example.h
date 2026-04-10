#ifndef CONFIG_H
#define CONFIG_H

// Wi-Fi credentials
static const char* WIFI_SSID = "test";
static const char* WIFI_PASSWORD = "condo2026";

// Backend endpoint
static const char* API_ENDPOINT = "https://iot-energy-monitor-api.onrender.com/api/readings";

// Node metadata
static const char* NODE_ID = "node-01";

// Single-appliance node configuration
static const int NUM_CHANNELS = 1;
static const int SENSOR_PINS[NUM_CHANNELS] = {0};
static const char* APPLIANCE_IDS[NUM_CHANNELS] = {"appliance-01"};
static const char* APPLIANCE_NAMES[NUM_CHANNELS] = {"Node 1"};

// Electrical references
static const float VOLTAGE_REF_V = 230.0f;
static const float FREQUENCY_HZ = 60.0f;

// Sampling and transmission
static const uint32_t SAMPLE_WINDOW_MS = 500;
static const uint32_t TRANSMIT_INTERVAL_MS = 5000;

// ADC/sensor calibration placeholders
static const float ADC_REF_V = 3.3f;
static const int ADC_MAX = 4095;
static const int ADC_MIDPOINT = 2048;
static const float BURDEN_OHMS = 22.0f;
static const float CT_RATIO = 2000.0f;
static const float ZERO_CURRENT_OFFSET_A = 0.56f;
static const float MIN_POWER_NOISE_W = 15.0f;
static const float CALIBRATION_FACTORS[NUM_CHANNELS] = {1.00f};

// Threshold (W) for abnormal/alert tagging
static const float POWER_THRESHOLDS_W[NUM_CHANNELS] = {500.0f};

#endif
