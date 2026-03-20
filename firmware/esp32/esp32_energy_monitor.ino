#include <WiFi.h>
#include <HTTPClient.h>
#include <math.h>

#include "config.h"

static float energyWh[NUM_CHANNELS] = {0.0f, 0.0f, 0.0f};
static uint32_t lastLoopMillis = 0;
static uint32_t lastTransmitMillis = 0;

static void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint8_t attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }
}

static float readCurrentRmsA(int pin, float calibrationFactor) {
  const float adcToVolt = ADC_REF_V / (float)ADC_MAX;
  float sumSquares = 0.0f;
  uint32_t samples = 0;
  uint32_t startMs = millis();

  while (millis() - startMs < SAMPLE_WINDOW_MS) {
    int raw = analogRead(pin);
    float centered = (float)(raw - ADC_MIDPOINT);
    float sensedV = centered * adcToVolt;

    // Simplified conversion placeholder:
    // Replace with your exact analog front-end transfer function.
    float currentA = (sensedV / BURDEN_OHMS) * CT_RATIO;

    sumSquares += currentA * currentA;
    samples++;
  }

  if (samples == 0) {
    return 0.0f;
  }

  float rms = sqrtf(sumSquares / (float)samples);
  return rms * calibrationFactor;
}

static String jsonEscape(const char* input) {
  String out;
  for (size_t i = 0; input[i] != '\0'; i++) {
    if (input[i] == '\"') {
      out += "\\\"";
    } else {
      out += input[i];
    }
  }
  return out;
}

static void postReading(
  uint8_t channel,
  float currentRmsA,
  float powerW,
  float energyWhValue,
  bool abnormal,
  uint32_t unixMillis
) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"nodeId\":\"" + jsonEscape(NODE_ID) + "\",";
  payload += "\"applianceId\":\"" + jsonEscape(APPLIANCE_IDS[channel]) + "\",";
  payload += "\"applianceName\":\"" + jsonEscape(APPLIANCE_NAMES[channel]) + "\",";
  payload += "\"currentRmsA\":" + String(currentRmsA, 4) + ",";
  payload += "\"voltageRefV\":" + String(VOLTAGE_REF_V, 2) + ",";
  payload += "\"powerW\":" + String(powerW, 2) + ",";
  payload += "\"energyWh\":" + String(energyWhValue, 4) + ",";
  payload += "\"frequencyHz\":" + String(FREQUENCY_HZ, 2) + ",";
  payload += "\"thresholdW\":" + String(POWER_THRESHOLDS_W[channel], 2) + ",";
  payload += "\"abnormal\":" + String(abnormal ? "true" : "false") + ",";
  payload += "\"timestampMs\":" + String(unixMillis);
  payload += "}";

  int statusCode = http.POST(payload);
  if (statusCode < 200 || statusCode >= 300) {
    // Keep lightweight for now; add retry queue if required.
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  connectWiFi();
  lastLoopMillis = millis();
  lastTransmitMillis = millis();
}

void loop() {
  uint32_t nowMs = millis();
  uint32_t deltaMs = nowMs - lastLoopMillis;
  lastLoopMillis = nowMs;

  connectWiFi();

  float deltaHours = (float)deltaMs / 3600000.0f;

  static float latestCurrentA[NUM_CHANNELS] = {0.0f, 0.0f, 0.0f};
  static float latestPowerW[NUM_CHANNELS] = {0.0f, 0.0f, 0.0f};
  static bool latestAbnormal[NUM_CHANNELS] = {false, false, false};

  for (int ch = 0; ch < NUM_CHANNELS; ch++) {
    float currentA = readCurrentRmsA(SENSOR_PINS[ch], CALIBRATION_FACTORS[ch]);
    float powerW = VOLTAGE_REF_V * currentA;
    bool abnormal = powerW > POWER_THRESHOLDS_W[ch];

    energyWh[ch] += powerW * deltaHours;

    latestCurrentA[ch] = currentA;
    latestPowerW[ch] = powerW;
    latestAbnormal[ch] = abnormal;
  }

  if (nowMs - lastTransmitMillis >= TRANSMIT_INTERVAL_MS) {
    for (int ch = 0; ch < NUM_CHANNELS; ch++) {
      postReading(ch, latestCurrentA[ch], latestPowerW[ch], energyWh[ch], latestAbnormal[ch], nowMs);
    }
    lastTransmitMillis = nowMs;
  }
}

