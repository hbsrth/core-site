"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { autoStartCorePreview } from "./preview.js";

/**
 * `<CoreProvider>`: layout'a bir kez sarılır.
 *
 *  - Canlı düzenleyici köprüsü: sayfa CORE çerçevesinde `?core-preview=1`
 *    ile açıldığında panelle el sıkışır; ziyaretçide hiçbir şey yapmaz.
 *  - Ziyaret izleyici: her sayfa geçişinde `/api/core/visit`'e küçük bir
 *    işaret gönderir (çerez yok, tanımlayıcı yok; Do Not Track'e uyar).
 */
export function CoreProvider({ children, basePath = "/api/core", track = true }: { children?: ReactNode; basePath?: string; track?: boolean }) {
  const pathname = usePathname();
  const first = useRef(true);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (window.parent === window) return;
    if (new URLSearchParams(window.location.search).get("core-preview") !== "1") return;
    const stop = autoStartCorePreview(process.env.NEXT_PUBLIC_CORE_ORIGIN ?? "");
    return () => stop();
  }, []);

  useEffect(() => {
    if (!track || typeof navigator === "undefined" || navigator.doNotTrack === "1") return;
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    const payload = JSON.stringify({ path: pathname, referrer: first.current ? document.referrer : "" });
    first.current = false;
    try {
      if (!navigator.sendBeacon?.(`${basePath}/visit`, new Blob([payload], { type: "application/json" }))) {
        void fetch(`${basePath}/visit`, { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
      }
    } catch {
      /* izleme sayfayı asla bozmamalı */
    }
  }, [pathname, basePath, track]);

  return <>{children}</>;
}
