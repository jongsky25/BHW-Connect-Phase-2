export const locales = ["fil", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fil";
export const localeCookieName = "BHW_LOCALE";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
