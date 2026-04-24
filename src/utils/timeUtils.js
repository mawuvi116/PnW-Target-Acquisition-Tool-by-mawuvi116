export function getHoursSinceActive(lastActive) {
  const last = new Date(lastActive).getTime();
  const now = Date.now();

  if (!Number.isFinite(last)) {
    return Number.POSITIVE_INFINITY;
  }

  return (now - last) / (1000 * 60 * 60);
}
