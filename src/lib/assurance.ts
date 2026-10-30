/** Prototype-only freshness helper. Production policy must use versioned server-side rules. */
export function isAssured(lastAttestedDate: string | undefined, simulatedDate: string, windowDays = 180): boolean {
  if (!lastAttestedDate || !simulatedDate || lastAttestedDate > simulatedDate) return false;
  const attested = new Date(`${lastAttestedDate}T12:00:00`).getTime();
  const today = new Date(`${simulatedDate}T12:00:00`).getTime();
  if (!Number.isFinite(attested) || !Number.isFinite(today)) return false;
  const ageDays = Math.floor((today - attested) / 86_400_000);
  return ageDays >= 0 && ageDays <= windowDays;
}
