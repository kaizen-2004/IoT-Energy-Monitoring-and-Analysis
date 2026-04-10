#include <WiFi.h>
#include <HTTPClient.h>
#include <math.h>

#include "config.h"

static float energyWh[NUM_CHANNELS] = {0};
static uint32_t lastLoopMillis = 0;
static uint32_t lastTransmitMillis = 0;
static uint32_t lastWifiConnectAttemptMs = 0;
static wl_status_t lastWifiStatus = WL_IDLE_STATUS;

static void connectWiFi() {
  wl_status_t status = WiFi.status();
  if (status != lastWifiStatus) {
    Serial.print("WiFi status: ");
    Serial.println((int)status);
    lastWifiStatus = status;
  }

  if (status == WL_CONNECTED) {
    return;
  }

  // Avoid restarting STA config while a previous connection attempt is still in flight.
  if (millis() - lastWifiConnectAttemptMs < 10000) {
    return;
  }

  lastWifiConnectAttemptMs = millis();

  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  Serial.print("Connecting WiFi to ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint8_t attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected, IP: ");
    Serial.println(WiFi.localIP());
    lastWifiStatus = WL_CONNECTED;
  } else {
    Serial.println("WiFi connect timeout");
  }
}

static float readCurrentRmsA(int pin, float calibrationFactor) {
  const float adcToVolt = ADC_REF_V / (float)ADC_MAX;
  float sum = 0.0f;
  float sumSquares = 0.0f;
  uint32_t samples = 0;
  uint32_t startMs = millis();

  while (millis() - startMs < SAMPLE_WINDOW_MS) {
    int raw = analogRead(pin);
    sum += (float)raw;
    sumSquares += (float)raw * (float)raw;
    samples++;
  }

  if (samples == 0) {
    return 0.0f;
  }

  const float avgRaw = sum / (float)samples;
  const float variance = fmaxf(0.0f, (sumSquares / (float)samples) - (avgRaw * avgRaw));
  const float acRmsVolts = sqrtf(variance) * adcToVolt;

  // Convert the AC burden voltage into primary current.
  const float currentA = (acRmsVolts / BURDEN_OHMS) * CT_RATIO;
  const float adjustedCurrentA = fmaxf(0.0f, currentA - ZERO_CURRENT_OFFSET_A);
  return adjustedCurrentA * calibrationFactor;
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
  bool abnormal
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
  payload += "\"abnormal\":" + String(abnormal ? "true" : "false");
  payload += "}";

  int statusCode = http.POST(payload);
  Serial.print("POST status: ");
  Serial.println(statusCode);
  if (statusCode < 200 || statusCode >= 300) {
    Serial.print("POST response: ");
    Serial.println(http.getString());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("ESP32 energy monitor starting");
  Serial.print("Node: ");
  Serial.println(NODE_ID);
  analogReadResolution(12);
  analogSetPinAttenuation(SENSOR_PINS[0], ADC_11db);
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

  static float latestCurrentA[NUM_CHANNELS] = {0};
  static float latestPowerW[NUM_CHANNELS] = {0};
  static bool latestAbnormal[NUM_CHANNELS] = {false};

  for (int ch = 0; ch < NUM_CHANNELS; ch++) {
    float currentA = readCurrentRmsA(SENSOR_PINS[ch], CALIBRATION_FACTORS[ch]);
    float powerW = VOLTAGE_REF_V * currentA;

    if (powerW < MIN_POWER_NOISE_W) {
      currentA = 0.0f;
      powerW = 0.0f;
    }

    bool abnormal = powerW > POWER_THRESHOLDS_W[ch];

    energyWh[ch] += powerW * deltaHours;

    latestCurrentA[ch] = currentA;
    latestPowerW[ch] = powerW;
    latestAbnormal[ch] = abnormal;
  }

  if (nowMs - lastTransmitMillis >= TRANSMIT_INTERVAL_MS) {
    for (int ch = 0; ch < NUM_CHANNELS; ch++) {
      Serial.print("Channel ");
      Serial.print(ch);
      Serial.print(" currentA=");
      Serial.print(latestCurrentA[ch], 4);
      Serial.print(" powerW=");
      Serial.print(latestPowerW[ch], 2);
      Serial.print(" energyWh=");
      Serial.print(energyWh[ch], 4);
      Serial.print(" abnormal=");
      Serial.println(latestAbnormal[ch] ? "true" : "false");
      postReading(ch, latestCurrentA[ch], latestPowerW[ch], energyWh[ch], latestAbnormal[ch]);
    }
    lastTransmitMillis = nowMs;
  }
}
