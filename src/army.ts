import type { Profile } from './types';

export type ArmyWeapon = {
  name: string;
  kind: 'ranged' | 'melee';
  count: number;
  modelCount: number;
  range: string;
  attacks: string;
  skill: string;
  strength: string;
  ap: string;
  damage: string;
  keywords: string;
};

export type ArmyModel = {
  name: string;
  count: number;
  m: string;
  t: string;
  sv: string;
  w: string;
  ld: string;
  oc: string;
  invuln: number | null;
  weapons: ArmyWeapon[];
};

export type ArmyUnit = {
  name: string;
  points: number;
  models: ArmyModel[];
};

export type Army = {
  name: string;
  faction: string;
  points: number;
  limit: number;
  units: ArmyUnit[];
};

export type AttackTarget = {
  toughness: number;
  save: number;
  invuln: number;
};

const CONFIG_NAMES = new Set(['Battle Size', 'Detachment', 'Show/Hide Options']);

export class ArmyImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArmyImportError';
  }
}

export function parseArmyJson(text: string): Army {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new ArmyImportError('This file is not valid JSON.');
  }
  return parseArmy(value);
}

export function parseArmy(value: unknown): Army {
  if (!isRecord(value)) throw new ArmyImportError('This roster could not be read.');
  const roster = isRecord(value.roster) ? value.roster : value;
  const forces = asArray(roster.forces).filter(isRecord);
  if (!forces.length) throw new ArmyImportError('This roster has no forces.');
  const units: ArmyUnit[] = [];
  for (const force of forces) {
    for (const selection of asArray(force.selections)) {
      if (!isRecord(selection) || isConfig(selection)) continue;
      if (selection.type === 'unit') units.push(unitFrom(selection));
      else if (selection.type === 'model') units.push(unitFrom(selection));
    }
  }
  if (!units.length) throw new ArmyImportError('This roster has no units.');
  const faction = [...new Set(forces.map(force => String(force.catalogueName ?? '').trim()).filter(Boolean))].join(', ');
  return {
    name: String(roster.name ?? '').trim() || 'Imported army',
    faction,
    points: pointsOf(roster, 'costs'),
    limit: pointsOf(roster, 'costLimits'),
    units,
  };
}

export function weaponProfile(unit: ArmyUnit, model: ArmyModel, weapon: ArmyWeapon, target: AttackTarget): Profile {
  const attacks = fixedAttacks(weapon);
  const damage = fixedDamage(weapon);
  const name = `${unit.name || model.name} · ${weapon.name}`.slice(0, 40).trim() || 'Weapon';
  return {
    name,
    attacks,
    hit: fixedHit(weapon),
    strength: fixedStat(weapon.strength, 1, 30, 1),
    toughness: legal(target.toughness, 1, 30, 4),
    ap: fixedStat(weapon.ap, -6, 0, 0),
    save: legal(target.save, 2, 7, 3),
    invuln: legalInvuln(target.invuln),
    damage,
    lethal: weapon.keywords.includes('Lethal Hits'),
    sustained: weapon.keywords.includes('Sustained Hits'),
    devastating: weapon.keywords.includes('Devastating Wounds'),
    reroll: false,
  };
}

export function weaponNeedsReview(weapon: ArmyWeapon): string[] {
  const notes: string[] = [];
  if (!/^\d+$/.test(weapon.attacks.trim())) {
    notes.push(`Attacks are ${weapon.attacks}, not a fixed number. Roll them on the table and enter the total before you start.`);
  }
  const damage = Number(weapon.damage);
  if (!/^\d+$/.test(weapon.damage.trim()) || damage < 1 || damage > 20) {
    notes.push(`Damage is ${weapon.damage}, not a fixed value from 1 to 20. Enter the rolled total before you start.`);
  }
  if (!/^[2-6]\+$/.test(weapon.skill.trim())) {
    notes.push(`Skill is ${weapon.skill}. Confirm the hit roll before you start (2+ is filled in until you change it).`);
  }
  if (weapon.count > 1 || weapon.modelCount > 1) {
    notes.push(`Listed on ${weapon.modelCount} model${weapon.modelCount === 1 ? '' : 's'} with weapon count ${weapon.count}. Fixed attacks are A × ${weapon.count}. Confirm how many are firing.`);
  }
  const ignored = ignoredKeywords(weapon.keywords);
  if (ignored.length) notes.push(`The roller does not apply ${ignored.join(', ')}. Resolve those on the tabletop.`);
  return notes;
}

function unitFrom(node: Record<string, unknown>): ArmyUnit {
  const inherited = standingInvuln(node);
  const children = asArray(node.selections).filter(isRecord).filter(child => !isConfig(child));
  const modelNodes = node.type === 'model' ? [node] : children.filter(child => child.type === 'model');
  const models = modelNodes.length ? modelNodes.map(model => modelFrom(model, inherited)) : [modelFrom(node, inherited)];
  if (node.type === 'unit' && modelNodes.length) {
    const loose: ArmyWeapon[] = [];
    for (const child of children) {
      if (child.type === 'model') continue;
      collectWeapons(child, models[0].count, loose);
    }
    if (loose.length) models[0].weapons.push(...loose);
  }
  return { name: String(node.name ?? 'Unit'), points: pointsOf(node, 'costs'), models };
}

function modelFrom(node: Record<string, unknown>, inherited: number | null): ArmyModel {
  const stats = unitStats(node);
  const weapons: ArmyWeapon[] = [];
  collectWeapons(node, countOf(node), weapons);
  return {
    name: String(node.name ?? 'Model'),
    count: countOf(node),
    m: stats.M || '—',
    t: stats.T || '—',
    sv: stats.SV || '—',
    w: stats.W || '—',
    ld: stats.LD || '—',
    oc: stats.OC || '—',
    invuln: standingInvuln(node) ?? inherited,
    weapons,
  };
}

function collectWeapons(node: Record<string, unknown>, modelCount: number, into: ArmyWeapon[]): void {
  if (isConfig(node)) return;
  const copies = countOf(node);
  for (const profile of asArray(node.profiles)) {
    if (!isRecord(profile)) continue;
    const kind = profile.typeName === 'Ranged Weapons' ? 'ranged' : profile.typeName === 'Melee Weapons' ? 'melee' : null;
    if (!kind) continue;
    into.push(weaponFrom(profile, kind, copies, modelCount));
  }
  for (const child of asArray(node.selections)) {
    if (!isRecord(child) || child.type === 'model' || child.type === 'unit' || isConfig(child)) continue;
    collectWeapons(child, modelCount, into);
  }
}

function weaponFrom(profile: Record<string, unknown>, kind: 'ranged' | 'melee', count: number, modelCount: number): ArmyWeapon {
  const stats = characteristics(profile);
  return {
    name: String(profile.name ?? 'Weapon').trim() || 'Weapon',
    kind,
    count,
    modelCount,
    range: stats.Range || '—',
    attacks: stats.A || '—',
    skill: (kind === 'ranged' ? stats.BS : stats.WS) || '—',
    strength: stats.S || '—',
    ap: stats.AP || '0',
    damage: stats.D || '—',
    keywords: stats.Keywords || '—',
  };
}

function standingInvuln(node: Record<string, unknown>): number | null {
  for (const profile of asArray(node.profiles)) {
    if (!isRecord(profile) || profile.typeName !== 'Abilities' || profile.name !== 'Invulnerable Save') continue;
    const description = characteristics(profile).Description;
    const match = description.match(/(\d+)\s*\+/);
    if (!match) continue;
    const value = Number(match[1]);
    if (value >= 2 && value <= 6) return value;
  }
  return null;
}

function unitStats(node: Record<string, unknown>): Record<string, string> {
  for (const profile of asArray(node.profiles)) {
    if (isRecord(profile) && profile.typeName === 'Unit') return characteristics(profile);
  }
  return {};
}

function characteristics(profile: Record<string, unknown>): Record<string, string> {
  const stats: Record<string, string> = {};
  for (const characteristic of asArray(profile.characteristics)) {
    if (!isRecord(characteristic)) continue;
    const name = String(characteristic.name ?? '').trim();
    if (name) stats[name] = textOf(characteristic);
  }
  return stats;
}

function textOf(characteristic: Record<string, unknown>): string {
  const raw = characteristic.$text ?? characteristic.text ?? characteristic['#text'];
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (isRecord(raw)) {
    const nested = raw.$text ?? raw.text ?? raw['#text'];
    if (typeof nested === 'string' || typeof nested === 'number') return String(nested);
  }
  return '';
}

function ignoredKeywords(keywords: string): string[] {
  return keywords.split(',').map(keyword => keyword.trim()).filter(keyword => keyword && keyword !== '-' && !keyword.includes('Lethal Hits') && !keyword.includes('Sustained Hits') && !keyword.includes('Devastating Wounds'));
}

function fixedAttacks(weapon: ArmyWeapon): number {
  if (!/^\d+$/.test(weapon.attacks.trim())) return 1;
  return clamp(Number(weapon.attacks) * Math.max(1, weapon.count), 1, 200);
}

function fixedDamage(weapon: ArmyWeapon): number {
  if (!/^\d+$/.test(weapon.damage.trim())) return 1;
  const value = Number(weapon.damage);
  return value >= 1 && value <= 20 ? value : 1;
}

function fixedHit(weapon: ArmyWeapon): number {
  const match = /^([2-6])\+$/.exec(weapon.skill.trim());
  return match ? Number(match[1]) : 2;
}

function fixedStat(text: string, min: number, max: number, fallback: number): number {
  if (!/^-?\d+$/.test(text.trim())) return fallback;
  return clamp(Number(text), min, max);
}

function legal(value: number, min: number, max: number, fallback: number): number {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function legalInvuln(value: number): number {
  if (value === 0) return 0;
  return Number.isInteger(value) && value >= 2 && value <= 6 ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pointsOf(node: Record<string, unknown>, key: 'costs' | 'costLimits'): number {
  const costs = asArray(node[key]).filter(isRecord);
  const points = costs.find(cost => cost.name === 'pts');
  const value = Number(points?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function countOf(node: Record<string, unknown>): number {
  const value = Number(node.number ?? 1);
  if (!Number.isInteger(value) || value < 1) return 1;
  return value;
}

function isConfig(node: Record<string, unknown>): boolean {
  return node.type === 'upgrade' && CONFIG_NAMES.has(String(node.name ?? ''));
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
