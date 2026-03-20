#ifndef CONFIG_H
#define CONFIG_H

// Wi-Fi credentials
static const char* WIFI_SSID = "YOUR_WIFI_SSID";
static const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend endpoint
static const char* API_ENDPOINT = "http://192.168.1.100:8080/api/readings";

// Node metadata
static const char* NODE_ID = "node-01";

// Appliance/channel configuration
static const int NUM_CHANNELS = 3;
static const int SENSOR_PINS[NUM_CHANNELS] = {34, 35, 32};
static const char* APPLIANCE_IDS[NUM_CHANNELS] = {"appliance-01", "appliance-02", "appliance-03"};
static const char* APPLIANCE_NAMES[NUM_CHANNELS] = {"electric-fan", "rice-cooker", "television"};

// Electrical references (adjust to local grid)
static const float VOLTAGE_REF_V = 230.0f;
static const float FREQUENCY_HZ = 60.0f;

// Sampling and transmission
static const uint32_t SAMPLE_WINDOW_MS = 500;
static const uint32_t TRANSMIT_INTERVAL_MS = 5000;

// ADC/sensor calibration placeholders
static const float ADC_REF_V = 3.3f;
static const int ADC_MAX = 4095;
static const int ADC_MIDPOINT = 2048;
static const float BURDEN_OHMS = 100.0f;
static const float CT_RATIO = 2000.0f;  // Example ratio placeholder
static const float CALIBRATION_FACTORS[NUM_CHANNELS] = {1.00f, 1.00f, 1.00f};

// Thresholds (W) for abnormal/alert tagging
static const float POWER_THRESHOLDS_W[NUM_CHANNELS] = {250.0f, 1200.0f, 250.0f};

#endif

