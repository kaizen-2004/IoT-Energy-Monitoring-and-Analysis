# Appliance Power Monitoring Concepts

## 1. System Overview

This sketch measures the analog waveform produced by the SCT current sensor, estimates the appliance current, converts that current into estimated power using a `230V` nominal mains reference, smooths the result using a moving average, and automatically determines whether the appliance is ON or OFF.

The processing flow is:

1. Acquire many ADC samples from the sensor.
2. Compute the midpoint or offset using the average of many samples.
3. Compute the raw ADC RMS around that midpoint.
4. Remove the no-load baseline using RMS subtraction.
5. Convert the corrected ADC RMS into estimated current.
6. Convert the current into estimated power using `230V` nominal mains.
7. Smooth the estimated power using the average of the last `20` readings.
8. Compare the smoothed power against a threshold to decide whether the appliance is ON or OFF.

Purpose of each major stage:

- **Signal acquisition**: captures the analog waveform from the SCT sensor.
- **Midpoint calculation**: finds the bias center of the waveform so AC variation can be measured correctly.
- **RMS calculation**: measures the effective size of the AC signal.
- **Baseline subtraction**: reduces false readings when no appliance is connected.
- **Calibration**: converts corrected ADC RMS into estimated current.
- **Power estimation**: computes estimated wattage from current and nominal voltage.
- **Smoothing**: reduces short-term fluctuation and noise.
- **ON/OFF detection**: determines appliance activity from the smoothed power value.

## 2. Concepts Used

### Analog signal sampling

The microcontroller reads the sensor output as analog values through `analogRead(...)`. These samples represent the biased AC waveform coming from the current sensor.

### Midpoint / offset

Because the AC waveform is shifted upward to fit inside the ADC input range, the signal is centered around a midpoint rather than around zero volts. This midpoint is called the offset.

### Why we use the average of many samples for offset

The offset is estimated by averaging many ADC readings. This makes the midpoint estimate more stable and less sensitive to random noise or individual spikes.

### RMS

RMS, or root-mean-square, is used because the sensor signal is an AC waveform. RMS gives a single value that represents the effective magnitude of the varying signal.

### Baseline / no-load RMS

Even when no appliance is connected, the circuit usually still produces a small residual signal due to sensor noise, ADC noise, wiring pickup, and analog front-end imperfections. This residual value is the no-load baseline RMS.

### RMS subtraction for baseline correction

The no-load baseline is removed using RMS subtraction, not simple subtraction. This is because RMS values are based on squared quantities. Subtracting in the squared domain gives a more technically correct correction.

### Calibration factor

The calibration factor converts corrected ADC RMS into estimated current in amperes. This factor is determined experimentally and depends on the sensor, biasing circuit, ADC behavior, and overall hardware setup.

### Nominal voltage reference

The sketch uses `230V` as the nominal mains voltage reference. This is used to convert estimated current into estimated power.

### Estimated power versus real power

This system currently measures current only. It does not measure the voltage waveform directly and it does not calculate power factor. Therefore, the reported wattage is an estimated power value rather than a true wattmeter-grade real power measurement.

### Moving average smoothing

The system stores the last `20` estimated power readings and averages them. This moving average reduces noise and makes the displayed output more stable.

### ON/OFF threshold detection

The sketch compares the smoothed power to a threshold. If the smoothed power is greater than or equal to the threshold, the appliance is considered ON. Otherwise, it is considered OFF.

## 3. Formulas Used

### Midpoint / offset using the average of many samples

$$
\text{offset} = \frac{1}{N}\sum_{i=1}^{N} x_i
$$

Where:

- $x_i$ = each ADC sample
- $N$ = total number of samples

### Raw ADC RMS

$$
\text{adcRms} = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(x_i - \text{offset})^2}
$$

This computes the effective AC magnitude of the waveform after removing the midpoint.

### Baseline-corrected RMS using RMS subtraction

$$
\text{correctedSq} = (\text{adcRms})^2 - (\text{idleAdcRms})^2
$$

If:

$$
\text{correctedSq} < 0
$$

then it is clamped to zero:

$$
\text{correctedSq} = 0
$$

Then:

$$
\text{netAdcRms} = \sqrt{\text{correctedSq}}
$$

### Current estimation

$$
I = \text{netAdcRms} \times K
$$

Where:

- $I$ = estimated current in amperes
- $K$ = calibration factor

### Power estimation

$$
P_{\text{estimated}} = I \times 230
$$

Where:

- $P_{\text{estimated}}$ = estimated power in watts
- `230` = nominal mains voltage reference

### Moving average over the last 20 readings

$$
P_{\text{smoothed}} = \frac{1}{M}\sum_{j=1}^{M} P_j
$$

Where:

- $P_j$ = each of the most recent estimated power readings
- $M$ = number of values in the moving window, up to `20`

### ON/OFF logic condition

$$
\text{applianceOn} =
\begin{cases}
\text{true}, & P_{\text{smoothed}} \geq P_{\text{threshold}} \\
\text{false}, & P_{\text{smoothed}} < P_{\text{threshold}}
\end{cases}
$$

Where:

- $P_{\text{threshold}}$ = ON/OFF threshold in watts

## 4. Feature Highlights

- **Automatic appliance ON/OFF detection** using a smoothed power threshold.
- **Smoothing using the average of the last 20 readings** so the output is more stable and less noisy.
- **Baseline subtraction** so unplugged or no-load readings move close to `0W`.
- **Real-time current and estimated power output** for live monitoring and logging.

## 5. Limitations

### Why this is estimated power only

The system measures current only and uses a fixed nominal voltage reference. Because it does not directly sample the mains voltage waveform, the result is an estimated power value, not a direct real-power measurement.

### Why motor loads and chargers may not match label wattage exactly

Motor loads and chargers often draw non-sinusoidal current or have varying power demand depending on their operating state. Because of this, the measured estimate may differ from the device label or rated power.

### Why current-only measurement cannot perfectly compute real power

True real power depends on both the voltage waveform and the current waveform, including their phase relationship. Measuring current alone is not enough to calculate real power precisely.

### Why power factor matters

For inductive or non-linear loads, current and voltage are not always in phase. This means apparent power and real power are different. Since this system does not measure phase angle or power factor, some loads will not match their labeled wattage closely.

## 6. Good Technical Explanation for Report / Thesis / Demo

This prototype estimates appliance power consumption by measuring the output waveform of an SCT current sensor through the microcontroller ADC. Because the sensor signal is biased around a midpoint rather than centered at zero, the first processing step is to estimate the offset by averaging many ADC samples. This produces a stable midpoint reference for AC signal measurement.

After the midpoint is determined, the system computes the RMS value of the waveform relative to that midpoint. RMS is used because it provides a meaningful measure of the effective magnitude of an AC signal. To reduce false readings when no appliance is connected, the measured RMS is corrected using a previously measured no-load baseline. This is done using RMS subtraction, which is more technically correct than simple subtraction for RMS quantities.

The corrected ADC RMS is then converted into estimated current using a calibration factor derived from testing. Estimated power is calculated by multiplying the estimated current by the nominal mains reference of `230V`. This value should be interpreted as estimated power because the system does not directly measure voltage waveform or power factor.

To make the output more stable and easier to interpret, the system applies a moving average over the last `20` estimated power readings. This smoothing reduces short-term fluctuation caused by ADC noise, sensor noise, and small transient variations. The smoothed value is then used for appliance ON/OFF detection. If the smoothed power exceeds the defined threshold, the appliance is considered ON; otherwise, it is considered OFF.

This approach allows the system to show distinct changes in appliance activity while keeping the output stable enough for monitoring, demonstration, and documentation purposes.

## 7. Optional Improvements

### Hysteresis for better ON/OFF stability

Use different thresholds for turning ON and turning OFF. This prevents rapid switching when the power value is close to the threshold.

### Better calibration workflow

Use one or more known reference loads and compute calibration from average measured values over time. This gives a more reliable calibration factor.

### Migration to ESP32 later

The same signal-processing pipeline can be migrated to ESP32 while adding:

- Wi-Fi connectivity
- cloud logging
- dashboard integration
- remote data access

### Real power measurement in the future

To improve from estimated power to real power measurement, a future version could add:

- voltage sensing
- synchronized voltage and current sampling
- real power computation
- power factor estimation

## Additional Notes From Testing

- For a `65W` laptop charger, measured estimated power around `48W` to `56W` was considered reasonable because `65W` is a maximum rating and actual draw depends on laptop load and charging state.
- For a `40W` fan, measured estimated power around `20W` to `23W` on one level and around `9W` to `12W` on another level was considered believable because a fan is a motor load and power factor affects the relationship between current and real power.
- The system successfully showed distinct load changes and working ON/OFF detection.
- The code uses `windowSize = 20` so the displayed output is smoother and more stable.
