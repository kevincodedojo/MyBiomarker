"use client";

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    // Dev builds skip registration so HMR never fights a stale cache.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("service worker registration failed", err);
    });
  }, []);

  return null;
}
