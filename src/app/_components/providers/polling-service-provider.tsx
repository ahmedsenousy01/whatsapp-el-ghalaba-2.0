"use client";

import type React from "react";
import { useEffect } from "react";

export function PollingServiceProvider({
  children
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Polling Service Provider");
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}
