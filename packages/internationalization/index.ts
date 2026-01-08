import "server-only";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import type { NextRequest } from "next/server";

export const locales = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * Locale direction mapping for RTL support
 */
export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  es: "ltr",
  fr: "ltr",
  de: "ltr",
  it: "ltr",
  pt: "ltr",
  ja: "ltr",
  ko: "ltr",
  zh: "ltr",
  // Add RTL languages here:
  // ar: "rtl",
  // he: "rtl",
};

/**
 * Get locale from Accept-Language header
 */
export const getLocaleFromRequest = (request: NextRequest): Locale => {
  const headers = {
    "accept-language": request.headers.get("accept-language") ?? undefined,
  };

  const languages = new Negotiator({ headers }).languages();
  const matchedLocale = match(languages, Array.from(locales), defaultLocale);

  return matchedLocale as Locale;
};

/**
 * Get locale direction (LTR or RTL)
 */
export const getLocaleDirection = (locale: Locale): "ltr" | "rtl" => {
  return localeDirection[locale] ?? "ltr";
};

/**
 * Validate if a locale is supported
 */
export const isValidLocale = (locale: string): locale is Locale => {
  return locales.includes(locale as Locale);
};

/**
 * Get locale with fallback
 */
export const getLocale = (locale?: string | null): Locale => {
  if (locale && isValidLocale(locale)) {
    return locale;
  }
  return defaultLocale;
};

// Client-side exports (must be in separate file due to "use client")
export * from "./client";
