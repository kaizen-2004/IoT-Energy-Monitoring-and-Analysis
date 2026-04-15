const int sensorPin = A0;
const int sampleCount = 1000;

// Calibration factor: amps per ADC RMS count
const float calibrationFactor = 0.078;

// Philippine mains reference
const float voltageRef = 225.0;

// Measured no-load baseline from your testing
const float baselineAdcRms = 0.90;

// Minimum threshold to detect as ON
const float minPowerWatts = 10.0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  long offsetSum = 0;

  // Step 1: measure midpoint / DC offset
  for (int i = 0; i < sampleCount; i++) {
    offsetSum += analogRead(sensorPin);
  }
  float offset = offsetSum / (float)sampleCount;

  // Step 2: compute RMS around midpoint
  float sumSq = 0;
  for (int i = 0; i < sampleCount; i++) {
    float x = analogRead(sensorPin) - offset;
    sumSq += x * x;
  }

  float adcRms = sqrt(sumSq / sampleCount);

  // Step 3: subtract no-load baseline
  float effectiveAdcRms = adcRms - baselineAdcRms;
  if (effectiveAdcRms < 0) {
    effectiveAdcRms = 0;
  }

  // Step 4: convert to current
  float current = effectiveAdcRms * calibrationFactor;

  // Step 5: estimate power
  float power = current * voltageRef;

  // Step 6: clamp tiny residual readings to zero
  if (power < minPowerWatts) {
    current = 0.0;
    power = 0.0;
  }

  // Simple output format for ESP32: P<power>,C<current>,S<state>
  // Example: P123.45,C0.54,SON or P0.00,C0.00,SOFF
  Serial.print("P");
  Serial.print(power, 2);
  Serial.print(",C");
  Serial.print(current, 2);
  Serial.print(",S");
  if (power >= minPowerWatts) {
    Serial.println("ON");
  } else {
    Serial.println("OFF");
  }

  delay(500);
}