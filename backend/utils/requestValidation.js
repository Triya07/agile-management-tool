function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requireNonEmptyString(value, fieldLabel) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return { error: `${fieldLabel} is required` };
  }
  return { value: normalized };
}

function validateEnum(value, allowedValues, fieldLabel) {
  if (value === undefined || value === null || value === "") {
    return { ok: true };
  }

  if (!allowedValues.includes(value)) {
    return { error: `Invalid ${fieldLabel}` };
  }

  return { ok: true };
}

module.exports = {
  normalizeString,
  requireNonEmptyString,
  validateEnum
};
