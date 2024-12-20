import { useEffect } from "react";

export function usePollingService({ func }: { func: () => void }) {
  useEffect(() => {
    const interval = setInterval(() => {
      func();
    }, 5000);
    return () => clearInterval(interval);
  }, [func]);
}
