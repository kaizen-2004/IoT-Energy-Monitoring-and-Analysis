#include <Arduino.h>
#include <WiFi.h>
#include <math.h>

// ESP32-C3 ADC debug sketch for SCT-013 bias and no-load testing.
//
// Goal:
// 1. Force 10-bit ADC
// 2. Keep 11 dB attenuation
// 3. Check whether raw midpoint stays near 512
// 4. Check whether no-load ADC RMS is small and stable
// 5. Record the average no-load ADC RMS to use later as idleAdcRms

static const char* WIFI_SSID = "test";
static const char* WIFI_PASSWORD = "condo2026";
static const int SENSOR_PIN = 0;
static const int SAMPLE_COUNT = 1000;
static const int IDLE_AVERAGE_WINDOWS = 20;
static const uint32_t REPORT_DELAY_MS = 750;

static float idleRmsHistory[IDLE_AVERAGE_WINDOWS] = {0};
static int idleRmsIndex = 0;
static bool idleRmsFilled = false;

static float updateIdleRmsAverage(float adcRms) {
  idleRmsHistory[idleRmsIndex] = adcRms;
  idleRmsIndex++;

  if (idleRmsIndex >= IDLE_AVERAGE_WINDOWS) {
    idleRmsIndex = 0;
    idleRmsFilled = true;
  }

  const int count = idleRmsFilled ? IDLE_AVERAGE_WINDOWS : idleRmsIndex;
  if (count <= 0) {
    return adcRms;
  }

  float sum = 0.0f;
  for (int i = 0; i < count; i++) {
    sum += idleRmsHistory[i];
  }
  return sum / (float)count;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("ESP32-C3 ADC debug sketch WITH Wi-Fi");
  Serial.println("Steps:");
  Serial.println("1. Leave clamp with no wire inside it");
  Serial.println("2. Connect Wi-Fi (simulating main firmware conditions)");
  Serial.println("3. Watch raw average; target is near 512 in 10-bit mode");
  Serial.println("4. Watch adcRms and avgIdleAdcRms; record this for idleAdcRms");
  Serial.println("5. Use avgIdleAdcRms later as idleAdcRms in the main firmware");

  analogReadResolution(10);
  analogSetPinAttenuation(SENSOR_PIN, ADC_11db);

  Serial.print("Sensor pin: GPIO");
  Serial.println(SENSOR_PIN);
  Serial.println("ADC resolution: 10-bit");
  Serial.println("ADC attenuation: 11 dB");

  Serial.print("Connecting WiFi to ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  uint8_t attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connect failed");
  }
}

void loop() {
  long rawSum = 0;
  int rawMin = 1023;
  int rawMax = 0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    const int raw = analogRead(SENSOR_PIN);
    rawSum += raw;
    if (raw < rawMin) rawMin = raw;
    if (raw > rawMax) rawMax = raw;
  }

  const float offset = rawSum / (float)SAMPLE_COUNT;

  float sumSq = 0.0f;
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    const float sample = (float)analogRead(SENSOR_PIN) - offset;
    sumSq += sample * sample;
  }

  const float adcRms = sqrtf(sumSq / (float)SAMPLE_COUNT);
  const float avgIdleAdcRms = updateIdleRmsAverage(adcRms);

  Serial.print("rawAvg=");
  Serial.print(offset, 2);
  Serial.print(" rawMin=");
  Serial.print(rawMin);
  Serial.print(" rawMax=");
  Serial.print(rawMax);
  Serial.print(" midpointError=");
  Serial.print(offset - 512.0f, 2);
  Serial.print(" adcRms=");
  Serial.print(adcRms, 2);
  Serial.print(" avgIdleAdcRms=");
  Serial.println(avgIdleAdcRms, 2);

  delay(REPORT_DELAY_MS);
}
