import type { Army, ArmyModel, ArmyUnit, ArmyWeapon } from "./army";
import type { CodexUnit, CodexWeapon } from "./codex";

export function markedSkill(skill: string): string {
  const text = skill.trim();
  if (/^\d+$/.test(text)) return `${text}+`;
  return text;
}

export function codexToArmyUnit(unit: CodexUnit, pointsIndex: number): ArmyUnit {
  const choice = unit.points[pointsIndex] ?? unit.points[0];
  const count = modelCount(choice?.label);
  const weapons = unit.weapons.map((weapon) => toWeapon(weapon, count));
  const models: ArmyModel[] = (unit.models.length ? unit.models : [blankModel(unit.name)]).map(
    (model, index) => ({
      name: model.name || unit.name,
      count: unit.models.length > 1 ? 1 : count,
      m: model.m,
      t: model.t,
      sv: model.sv,
      w: model.w,
      ld: model.ld,
      oc: model.oc,
      invuln: invulnerableValue(model.invulnerable),
      weapons: index === 0 ? weapons : [],
    }),
  );
  return {
    name: unit.name,
    points: pointCost(choice?.cost),
    models,
  };
}

export function draftArmy(
  name: string,
  faction: string,
  limit: number,
  units: ArmyUnit[],
): Army {
  return {
    name: name.trim() || "Codex army",
    faction,
    points: units.reduce((sum, unit) => sum + unit.points, 0),
    limit,
    units,
  };
}

function toWeapon(weapon: CodexWeapon, modelCount: number): ArmyWeapon {
  const kind = weapon.kind.toLowerCase().includes("melee") || weapon.range === "Melee"
    ? "melee"
    : "ranged";
  return {
    name: weapon.name,
    kind,
    count: 1,
    modelCount,
    range: weapon.range,
    attacks: weapon.attacks,
    skill: markedSkill(weapon.skill),
    strength: weapon.strength,
    ap: weapon.ap,
    damage: weapon.damage,
    keywords: weapon.rules,
  };
}

function modelCount(label: string | undefined): number {
  const match = /^(\d+)/.exec(label?.trim() ?? "");
  const count = match ? Number(match[1]) : 1;
  return count > 0 ? count : 1;
}

function pointCost(cost: string | undefined): number {
  const value = Number(cost);
  return Number.isFinite(value) ? value : 0;
}

function invulnerableValue(value: string): number | null {
  const match = /^([2-6])\+/.exec(value.trim());
  return match ? Number(match[1]) : null;
}

function blankModel(name: string) {
  return {
    name,
    m: "",
    t: "",
    sv: "",
    w: "",
    ld: "",
    oc: "",
    invulnerable: "",
    base: "",
  };
}
