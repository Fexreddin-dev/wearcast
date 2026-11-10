"use client";

import { useLayoutEffect } from "react";

// If the page root is ever rebuilt in the browser, the saved theme is put back before the screen is painted.
export default function ThemeKeeper() {
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem("wc-theme");
      if (saved && document.documentElement.getAttribute("data-theme") !== saved) {
        document.documentElement.setAttribute("data-theme", saved);
      }
    } catch {
      /* storage unavailable: the system preference from the head script stays */
    }
  }, []);
  return null;
}
