"use client";

import { usePollingService } from "@/hooks/use-polling-service";
import { useRSAKeyGeneration } from "@/hooks/use-rsa-key-generation";
import { api } from "@/trpc/react";

export function Providers({ children }: { children: React.ReactNode }) {
  useRSAKeyGeneration();
  // usePollingService();

  return <>{children}</>;
}
