import { ro } from "./translations.ro";

export type Language = "ro" | "en";
export type Translations = typeof ro;

/**
 * Only the Romanian dictionary ships in the initial bundle (primary audience).
 * The English dictionary is fetched on demand by LanguageProvider.
 */
export const translations = { ro };
export { ro };
export const loadEnglish = () => import("./translations.en").then((m) => m.en);
