function isString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateReadingPayload(body) {
  const errors = [];

  const requiredStringFields = ["nodeId", "applianceId", "applianceName"];
  for (const field of requiredStringFields) {
    if (!isString(body[field])) {
      errors.push(`${field} is required and must be a non-empty string`);
    }
  }

  const requiredNumberFields = ["currentRmsA", "voltageRefV", "powerW", "thresholdW"];
  for (const field of requiredNumberFields) {
    if (!isNumber(body[field])) {
      errors.push(`${field} is required and must be a finite number`);
    }
  }

  if (body.energyWh !== undefined && !isNumber(body.energyWh)) {
    errors.push("energyWh must be a finite number when provided");
  }

  if (body.frequencyHz !== undefined && !isNumber(body.frequencyHz)) {
    errors.push("frequencyHz must be a finite number when provided");
  }

  if (body.abnormal !== undefined && typeof body.abnormal !== "boolean") {
    errors.push("abnormal must be a boolean when provided");
  }

  if (body.timestamp !== undefined && Number.isNaN(new Date(body.timestamp).getTime())) {
    errors.push("timestamp must be a valid date string when provided");
  }

  if (body.timestampMs !== undefined && !isNumber(body.timestampMs)) {
    errors.push("timestampMs must be a finite number when provided");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateSettingsPayload(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      errors: ["payload must be a JSON object"]
    };
  }

  const hasAnyKnownField =
    body.electricityRate !== undefined ||
    body.effectiveMonth !== undefined ||
    body.nodeLabels !== undefined ||
    body.nodeThresholds !== undefined ||
    body.timezone !== undefined;

  if (!hasAnyKnownField) {
    errors.push(
      "provide at least one of: electricityRate, effectiveMonth, nodeLabels, nodeThresholds, timezone"
    );
  }

  if (body.electricityRate !== undefined) {
    if (!isNumber(body.electricityRate) || body.electricityRate < 0) {
      errors.push("electricityRate must be a finite number >= 0");
    }
  }

  if (body.effectiveMonth !== undefined) {
    const monthOk =
      typeof body.effectiveMonth === "string" &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(body.effectiveMonth);
    if (!monthOk) {
      errors.push("effectiveMonth must be in YYYY-MM format");
    }
  }

  if (body.nodeLabels !== undefined) {
    const validLabels =
      Array.isArray(body.nodeLabels) &&
      body.nodeLabels.length === 3 &&
      body.nodeLabels.every((label) => typeof label === "string" && label.trim().length > 0);
    if (!validLabels) {
      errors.push("nodeLabels must be an array of 3 non-empty strings");
    }
  }

  if (body.nodeThresholds !== undefined) {
    const validThresholds =
      Array.isArray(body.nodeThresholds) &&
      body.nodeThresholds.length === 3 &&
      body.nodeThresholds.every((value) => isNumber(value) && value >= 0);
    if (!validThresholds) {
      errors.push("nodeThresholds must be an array of 3 finite numbers >= 0");
    }
  }

  if (body.timezone !== undefined) {
    if (!isString(body.timezone)) {
      errors.push("timezone must be a non-empty string");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function normalizeReading(body) {
  const nowIso = new Date().toISOString();
  const ts =
    body.timestamp && !Number.isNaN(new Date(body.timestamp).getTime())
      ? new Date(body.timestamp).toISOString()
      : isNumber(body.timestampMs)
        ? new Date(body.timestampMs).toISOString()
        : nowIso;

  return {
    nodeId: body.nodeId,
    applianceId: body.applianceId,
    applianceName: body.applianceName,
    currentRmsA: body.currentRmsA,
    voltageRefV: body.voltageRefV,
    powerW: body.powerW,
    energyWh: body.energyWh ?? null,
    frequencyHz: body.frequencyHz ?? null,
    thresholdW: body.thresholdW,
    abnormal: body.abnormal ?? false,
    timestamp: ts,
    receivedAt: nowIso
  };
}

module.exports = {
  validateReadingPayload,
  validateSettingsPayload,
  normalizeReading
};
