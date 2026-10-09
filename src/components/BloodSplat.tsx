import { useEffect, useState } from "react";
import type { BloodHit } from "../bloodMotion";

const SPLASH_MS = 1700;

export function useBloodSplash(hit: BloodHit | null, enabled: boolean) {
  const [showing, setShowing] = useState(false);
  useEffect(() => {
    if (!enabled || !hit) {
      setShowing(false);
      return;
    }
    const age = Date.now() - hit.at;
    if (age > SPLASH_MS) return;
    setShowing(true);
    const id = window.setTimeout(() => setShowing(false), SPLASH_MS - age);
    return () => window.clearTimeout(id);
  }, [enabled, hit]);
  return showing;
}

export function BloodSplat() {
  return (
    <span className="blood-splat" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
