export function normalizeLocationName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function locationNamesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return normalizeLocationName(a) === normalizeLocationName(b);
}

export function findLocationIdByName(
  locations: Array<{ id: string; name: string }>,
  raw: string
): string | null {
  const target = normalizeLocationName(raw);
  for (const loc of locations) {
    if (normalizeLocationName(loc.name) === target) return loc.id;
  }
  return null;
}
