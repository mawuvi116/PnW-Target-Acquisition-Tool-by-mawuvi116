export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function toNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

export function safeRatio(a, b) {
  const numerator = toNumber(a);
  const denominator = toNumber(b);

  if (denominator <= 0) {
    return numerator > 0 ? 2 : 1;
  }

  return numerator / denominator;
}
