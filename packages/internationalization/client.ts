"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

// Import locale type without importing server-only code
type Locale = "en" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "ko" | "zh";

/**
 * Hook to get current locale from URL
 */
export const useLocale = (): Locale => {
  const params = useParams();
  const locale = params?.locale as string | undefined;
  return locale && isValidLocale(locale) ? locale : "en";
};

/**
 * Hook to change locale
 */
export const useChangeLocale = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (newLocale: string) => {
    startTransition(() => {
      const pathWithoutLocale = pathname.replace(/^\/[^/]+/, "");
      router.push(`/${newLocale}${pathWithoutLocale}`);
    });
  };
};

/**
 * Validate if a locale is supported
 */
const isValidLocale = (locale: string): locale is Locale => {
  return ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"].includes(locale);
};

