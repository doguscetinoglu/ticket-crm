"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HEARTBEAT_MS, IDLE_MS } from "@/lib/presence";

/**
 * Giriş yapmış ekip üyesi için arka planda heartbeat gönderir.
 * AppShell içinde mount edilir — login / portal / anket sayfalarında çalışmaz.
 */
export default function PresenceTracker() {
  const path = usePathname();
  const pathRef = useRef(path);

  useEffect(() => { pathRef.current = path; }, [path]);

  useEffect(() => {
    const lastActivity = { at: Date.now() };
    const bump = () => { lastActivity.at = Date.now(); };
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const send = () => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathRef.current,
          idle: Date.now() - lastActivity.at > IDLE_MS,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    send();
    const timer = setInterval(send, HEARTBEAT_MS);

    // Sekmeye geri dönüldüğünde durumu hemen tazele.
    const onVisibility = () => {
      if (document.visibilityState === "visible") { bump(); send(); }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Sekme kapanınca / sayfadan çıkılınca anında çevrimdışı işaretle.
    const goOffline = () => {
      const payload = JSON.stringify({ offline: true });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/presence", new Blob([payload], { type: "application/json" }));
      }
    };
    window.addEventListener("pagehide", goOffline);

    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", goOffline);
    };
  }, []);

  return null;
}
