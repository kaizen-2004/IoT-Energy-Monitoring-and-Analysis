function isString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isMonthString(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function normalizeCan(value) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function validateCanValue(value, field = "can") {
  const normalized = normalizeCan(value);
  return normalized.length >= 10 ? null : `${field} must contain at least 10 digits`;
}

function validateCanPayload(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      errors: ["payload must be a JSON object"]
    };
  }

  const canError = validateCanValue(body.can);
  if (canError) {
    errors.push(canError);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateCanSetupPayload(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      errors: ["payload must be a JSON object"]
    };
  }

  const canError = validateCanValue(body.can);
  if (canError) {
    errors.push(canError);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateCanChangePayload(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      errors: ["payload must be a JSON object"]
    };
  }

  const currentError = validateCanValue(body.currentCan, "currentCan");
  if (currentError) errors.push(currentError);
  const nextError = validateCanValue(body.newCan, "newCan");
  if (nextError) errors.push(nextError);

  return {
    valid: errors.length === 0,
    errors
  };
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
    if (!isMonthString(body.effectiveMonth)) {
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

function validateRateUpsertPayload(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      errors: ["payload must be a JSON object"]
    };
  }

  if (!isNumber(body.ratePerKwh) || body.ratePerKwh < 0) {
    errors.push("ratePerKwh is required and must be a finite number >= 0");
  }

  if (body.source !== undefined && !isString(body.source)) {
    errors.push("source must be a non-empty string when provided");
  }

  if (body.sourceUrl !== undefined && body.sourceUrl !== null) {
    if (!isString(body.sourceUrl)) {
      errors.push("sourceUrl must be a non-empty string when provided");
    } else {
      try {
        const parsed = new URL(body.sourceUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          errors.push("sourceUrl must use http or https");
        }
      } catch (_error) {
        errors.push("sourceUrl must be a valid URL");
      }
    }
  }

  if (body.verified !== undefined && typeof body.verified !== "boolean") {
    errors.push("verified must be a boolean when provided");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateRateDraftPayload(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      errors: ["payload must be a JSON object"]
    };
  }

  if (!isString(body.url)) {
    errors.push("url is required and must be a non-empty string");
  } else {
    try {
      const parsed = new URL(body.url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        errors.push("url must use http or https");
      }
    } catch (_error) {
      errors.push("url must be a valid URL");
    }
  }

  if (body.month !== undefined && !isMonthString(body.month)) {
    errors.push("month must be in YYYY-MM format when provided");
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
  normalizeCan,
  validateCanPayload,
  validateCanSetupPayload,
  validateCanChangePayload,
  validateReadingPayload,
  validateSettingsPayload,
  validateRateUpsertPayload,
  validateRateDraftPayload,
  isMonthString,
  normalizeReading
};
