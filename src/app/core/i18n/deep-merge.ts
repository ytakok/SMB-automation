export type TranslationValue = string | TranslationObject | TranslationValue[] | null | undefined;
export interface TranslationObject {
  [key: string]: TranslationValue;
}

function isRecord(value: unknown): value is TranslationObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepMerge(base: TranslationObject, override: TranslationObject): TranslationObject {
  const merged: TranslationObject = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = merged[key];
    merged[key] = isRecord(current) && isRecord(value) ? deepMerge(current, value) : value;
  }

  return merged;
}
