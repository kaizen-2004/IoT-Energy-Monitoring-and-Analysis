#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>

#include "config.h"

static HardwareSerial nanoSerial(1);

static float energyWh[NUM_CHANNELS] = {0};
static float smoothedPowerW[NUM_CHANNELS] = {0};
static bool applianceOnState[NUM_CHANNELS] = {false};
static uint32_t lastLoopMillis = 0;
static uint32_t lastTransmitMillis = 0;
static uint32_t lastWifiConnectAttemptMs = 0;
static wl_status_t lastWifiStatus = WL_IDLE_STATUS;
static float powerHistory[NUM_CHANNELS][SMOOTHING_WINDOW_SIZE] = {{0}};
static int powerHistoryIndex[NUM_CHANNELS] = {0};
static bool powerHistoryFilled[NUM_CHANNELS] = {false};
static String lastNanoReading = "";
static uint32_t lastDebugMs = 0;

static void connectWiFi() {
  wl_status_t status = WiFi.status();
  
  // Already connected - skip
  if (status == WL_CONNECTED) {
    return;
  }
  
  // Disconnected or never connected - retry
  // Avoid frequent retries - only retry every 30 seconds
  if (millis() - lastWifiConnectAttemptMs < 30000) {
    return;
  }
  
  // If previously failed, reset WiFi first
  if (lastWifiStatus == WL_CONNECT_FAILED || status == WL_CONNECT_FAILED) {
    WiFi.disconnect(true);
    delay(100);
  }

  lastWifiConnectAttemptMs = millis();
  lastWifiStatus = status;

  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  Serial.print("Connecting WiFi to ");
  Serial.println(WIFI_SSID);
  lastWifiStatus = WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // Wait up to 10 seconds for connection
  for (uint8_t attempts = 0; attempts < 20 && WiFi.status() != WL_CONNECTED; attempts++) {
    delay(500);
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("WiFi connected, IP: ");
      Serial.println(WiFi.localIP());
      lastWifiStatus = WL_CONNECTED;
      return;
    }
  }
  
  Serial.println("WiFi connect timeout");
}

static float updateSmoothedPower(uint8_t channel, float estimatedPowerW) {
  powerHistory[channel][powerHistoryIndex[channel]] = estimatedPowerW;
  powerHistoryIndex[channel]++;

  if (powerHistoryIndex[channel] >= SMOOTHING_WINDOW_SIZE) {
    powerHistoryIndex[channel] = 0;
    powerHistoryFilled[channel] = true;
  }

  float sum = 0.0f;
  const int count = powerHistoryFilled[channel] ? SMOOTHING_WINDOW_SIZE : powerHistoryIndex[channel];
  if (count <= 0) {
    return 0.0f;
  }

  for (int i = 0; i < count; i++) {
    sum += powerHistory[channel][i];
  }

  return sum / (float)count;
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
  float powerW,
  float currentA,
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
  payload += "\"currentRmsA\":" + String(currentA, 4) + ",";
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

static bool parseNanoReading(const String& line, float& powerW, float& currentA, bool& applianceOn) {
  // Expected format: P123.45,C0.54,SON or P0.00,C0.00,SOFF
  if (line.startsWith("P") && line.indexOf(",C") > 0 && line.indexOf(",S") > 0) {
    int pIndex = 1;
    int cIndex = line.indexOf(",C");
    int sIndex = line.indexOf(",S");
    
    String pStr = line.substring(pIndex, cIndex);
    String cStr = line.substring(cIndex + 2, sIndex);
    String state = line.substring(sIndex + 2);
    
    powerW = pStr.toFloat();
    currentA = cStr.toFloat();
    applianceOn = (state == "ON");
    
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("ESP32 energy monitor starting (Nano serial)");
  Serial.print("Node: ");
  Serial.println(NODE_ID);
  Serial.print("Nano RX pin: GPIO");
  Serial.println(NANO_SERIAL_RX_PIN);
  Serial.print("Nano TX pin: GPIO");
  Serial.println(NANO_SERIAL_TX_PIN);

  Serial.println("Initializing Nano serial on GPIO5...");
  nanoSerial.begin(115200, SERIAL_8N1, NANO_SERIAL_RX_PIN, NANO_SERIAL_TX_PIN);
  
  // Give Nano time to start and send first reading
  delay(1000);

  Serial.print("Setup complete. Waiting for Nano data...");
  
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

  // Debug: check if Nano is sending (throttled) - DISABLED for production
  /*
  if (nowMs - lastDebugMs > 2000) {
    lastDebugMs = nowMs;
    Serial.print("Nano avail:");
    Serial.print(nanoSerial.available());
    Serial.print(" ");
  }
  */
  
  while (nanoSerial.available()) {
    char c = nanoSerial.read();
    // Debug output - DISABLED
    // Serial.print("RX:");
    // Serial.print((int)c);
    // Serial.print(":");
    if (c == '\n' || c == '\r') {
      if (lastNanoReading.length() > 0) {
        float powerW = 0;
        float currentA = 0;
        bool applianceOn = false;
        
        if (parseNanoReading(lastNanoReading, powerW, currentA, applianceOn)) {
          // Only print when state changes or on transmit
          static bool lastState = false;
          if (applianceOn != lastState) {
            Serial.print("State: ");
            Serial.println(applianceOn ? "ON" : "OFF");
            lastState = applianceOn;
          }
          
          float smoothedPower = updateSmoothedPower(0, powerW);
          
          if (smoothedPower < MIN_POWER_NOISE_W) {
            powerW = 0.0f;
            currentA = 0.0f;
            smoothedPower = 0.0f;
          }

          const bool abnormal = smoothedPower > POWER_THRESHOLDS_W[0];

          energyWh[0] += smoothedPower * deltaHours;

          latestCurrentA[0] = currentA;
          latestPowerW[0] = smoothedPower;
          latestAbnormal[0] = abnormal;
          smoothedPowerW[0] = smoothedPower;
          applianceOnState[0] = applianceOn;
        }
        lastNanoReading = "";
      }
    } else {
      lastNanoReading += c;
    }
  }

  if (nowMs - lastTransmitMillis >= TRANSMIT_INTERVAL_MS) {
    for (int ch = 0; ch < NUM_CHANNELS; ch++) {
      Serial.print("Channel ");
      Serial.print(ch);
      Serial.print(" currentA=");
      Serial.print(latestCurrentA[ch], 4);
      Serial.print(" smoothedPowerW=");
      Serial.print(latestPowerW[ch], 2);
      Serial.print(" appliance=");
      Serial.print(applianceOnState[ch] ? "ON" : "OFF");
      Serial.print(" energyWh=");
      Serial.print(energyWh[ch], 4);
      Serial.print(" abnormal=");
      Serial.println(latestAbnormal[ch] ? "true" : "false");
      postReading(ch, latestPowerW[ch], latestCurrentA[ch], energyWh[ch], latestAbnormal[ch]);
    }
    lastTransmitMillis = nowMs;
  }
}