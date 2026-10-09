import { load, save } from "./api";
import type { Army } from "./army";

const LIBRARY_KEY = "bf.armies";

export function armiesFrom(value: unknown): Army[] {
  return Array.isArray(value) ? value.filter(isArmy).slice(-20) : [];
}

export function readArmyLibrary(): Army[] {
  const saved = load<unknown>(LIBRARY_KEY, null);
  const list = armiesFrom(saved);
  if (list.length) return list;
  const current = load<unknown>("bf.army", null);
  return isArmy(current) ? [current] : [];
}

export function writeArmyLibrary(armies: Army[]) {
  save(LIBRARY_KEY, armies.filter(isArmy).slice(-20));
}

export function removeArmy(name: string): Army[] {
  const key = name.trim().toLowerCase();
  const next = readArmyLibrary().filter((entry) => entry.name.trim().toLowerCase() !== key);
  writeArmyLibrary(next);
  return next;
}

export function upsertArmy(army: Army): Army[] {
  const name = army.name.trim().toLowerCase();
  const next = [
    ...readArmyLibrary().filter((entry) => entry.name.trim().toLowerCase() !== name),
    army,
  ].slice(-20);
  writeArmyLibrary(next);
  return next;
}

function isArmy(value: unknown): value is Army {
  if (!value || typeof value !== "object") return false;
  const army = value as Army;
  return typeof army.name === "string" && Array.isArray(army.units);
}
