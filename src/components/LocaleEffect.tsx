"use client";

import { useEffect } from "react";
import { useTracker } from "@/providers/TrackerProvider";

/** Applies the locale/RTL setting to the document root. Runs client-side
 * only (state is loaded from localStorage after mount), matching the app's
 * existing hydration-safe pattern for anything derived from local storage. */
export function LocaleEffect() {
  const { state } = useTracker();
  const locale = state?.settings.locale ?? "en";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
