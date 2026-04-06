"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function VersionGuard() {
  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION;
  const dismissed = useRef(false);

  useEffect(() => {
    if (!currentVersion) return;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    const check = async () => {
      if (dismissed.current) return;
      try {
        const res = await fetch(`${basePath}/version.json`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { version: string };
        if (data.version && data.version !== currentVersion) {
          dismissed.current = true;
          toast("A new version is available", {
            description: `${currentVersion} → ${data.version}`,
            duration: Infinity,
            action: {
              label: "Reload",
              onClick: () => window.location.reload(),
            },
          });
        }
      } catch {
        // Network error — skip silently
      }
    };

    const run = () => void check();
    const id = setInterval(run, POLL_INTERVAL);
    // First check after a short delay so the app loads first
    const timeout = setTimeout(run, 10_000);

    return () => {
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, [currentVersion]);

  return null;
}
