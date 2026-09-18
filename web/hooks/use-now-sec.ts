"use client";

import { useEffect, useState } from "react";

/** Wall-clock unix seconds, ticking so challenge-window countdowns stay live. */
export function useNowSec(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
