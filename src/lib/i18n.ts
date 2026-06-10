import es from "../messages/es.json";
import en from "../messages/en.json";
import ru from "../messages/ru.json";

export type Locale = "es" | "en" | "ru";
export const locales: Locale[] = ["es", "en", "ru"];
export const defaultLocale: Locale = "es";

export const dictionaries = {
  es,
  en,
  ru,
};

export function getDictionary(lang: Locale) {
  return dictionaries[lang] || dictionaries[defaultLocale];
}

// Flat key lookup helper (e.g. t('common.title'))
export function getTranslation(lang: Locale) {
  const dict = getDictionary(lang);
  return (keyPath: string, variables?: Record<string, string | number>): string => {
    const parts = keyPath.split(".");
    let current: any = dict;
    for (const part of parts) {
      if (current === undefined || current === null) return keyPath;
      current = current[part];
    }
    if (typeof current !== "string") return keyPath;
    
    let text = current;
    if (variables) {
      Object.entries(variables).forEach(([key, val]) => {
        text = text.replace(new RegExp(`{${key}}`, "g"), String(val));
      });
    }
    return text;
  };
}
