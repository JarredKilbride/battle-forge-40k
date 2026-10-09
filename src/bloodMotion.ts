import { load, save } from "./api";

const BLOOD_KEY = "bf.blood";

export type BloodHit = { unit: number; model: number; at: number };

export function readBloodMotion(): boolean {
  const stored = load<boolean | null>(BLOOD_KEY, null);
  if (typeof stored === "boolean") return stored;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function writeBloodMotion(enabled: boolean) {
  save(BLOOD_KEY, enabled);
}
