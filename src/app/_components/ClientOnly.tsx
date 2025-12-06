"use client";

import { type ReactNode, useSyncExternalStore } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Subscription function that never triggers updates (client state is stable)
const subscribe = () => () => {};

/**
 * Wrapper component that only renders children on the client side.
 * This prevents hydration mismatches from browser extensions like Dark Reader.
 * 
 * Uses useSyncExternalStore for reliable SSR/client detection.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  // useSyncExternalStore is the recommended way to detect client-side rendering
  // - Server: returns the serverSnapshot (false)
  // - Client: returns the clientSnapshot (true)
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,  // Client snapshot - always true on client
    () => false  // Server snapshot - always false on server
  );

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
