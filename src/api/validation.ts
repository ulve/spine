export const BOOK_SORT_FIELDS = new Set(['addedDate', 'title', 'seriesNumber']);
export const READING_STATUSES = new Set(['PLAN_TO_READ', 'READING', 'FINISHED', 'ABANDONED']);

export const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeStringArray = (value: unknown, fieldName: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of strings`);
  }

  return Array.from(
    new Set(
      value
        .map((entry) => {
          if (typeof entry !== 'string') {
            throw new Error(`${fieldName} must be an array of strings`);
          }

          return entry.trim();
        })
        .filter(Boolean)
    )
  );
};

export const normalizeOptionalUrl = (value: unknown, fieldName: string) => {
  const normalized = normalizeString(value);
  if (normalized === null) {
    return value === undefined ? undefined : null;
  }

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`${fieldName} must use http or https`);
    }
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }

  return normalized;
};

export const parsePaginationNumber = (
  value: unknown,
  fallback: number,
  { min, max }: { min: number; max: number }
) => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Value must be an integer between ${min} and ${max}`);
  }

  return parsed;
};
