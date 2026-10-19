export type CodexFaction = { id: string; name: string; link: string };

export type CodexModel = {
  name: string;
  m: string;
  t: string;
  sv: string;
  w: string;
  ld: string;
  oc: string;
  invulnerable: string;
  base: string;
};

export type CodexWeapon = {
  name: string;
  kind: string;
  range: string;
  attacks: string;
  skill: string;
  strength: string;
  ap: string;
  damage: string;
  rules: string;
};

export type CodexAbility = {
  name: string;
  type: string;
  model: string;
  description: string;
};

export type CodexRule = {
  id: string;
  name: string;
  type: string;
  cost: string;
  phase: string;
  detachment: string;
  description: string;
};

export type CodexUnit = {
  id: string;
  name: string;
  factionId: string;
  faction: string;
  source: string;
  role: string;
  legend: string;
  loadout: string;
  transport: string;
  virtual: boolean;
  damaged: string;
  damagedDescription: string;
  link: string;
  keywords: string[];
  factionKeywords: string[];
  models: CodexModel[];
  weapons: CodexWeapon[];
  abilities: CodexAbility[];
  options: string[];
  composition: string[];
  points: { label: string; cost: string }[];
  leads: string[];
  ledBy: string[];
  stratagemIds: string[];
  enhancementIds: string[];
  detachmentAbilityIds: string[];
};

export type Codex = {
  updated: string;
  attribution: string;
  factions: CodexFaction[];
  stratagems: Record<string, CodexRule>;
  enhancements: Record<string, CodexRule>;
  detachmentAbilities: Record<string, CodexRule>;
  units: CodexUnit[];
};

export type UnitHit = {
  id: string;
  name: string;
  factionId: string;
  faction: string;
  role: string;
};

export type UnitDetail = CodexUnit & {
  stratagems: CodexRule[];
  enhancements: CodexRule[];
  detachmentAbilities: CodexRule[];
};

export function parsePipeCsv(text: string): Record<string, string>[] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    if (quoted) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === "|") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [headerRow, ...body] = rows;
  if (!headerRow) return [];
  const header = headerRow.map((cell) => cell.trim());
  return body
    .filter((cells) => cells.some((cell) => cell.trim()))
    .map((cells) => {
      const record: Record<string, string> = {};
      header.forEach((key, index) => {
        if (key) record[key] = cells[index] ?? "";
      });
      return record;
    });
}

export function htmlToText(value: string): string {
  const broken = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ");
  const stripped = broken.replace(/<[^>]+>/g, "");
  return stripped
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function formatInvulnerable(value: string): string {
  const text = value.trim();
  if (!text || text === "-") return "";
  if (text.endsWith("+")) return text;
  if (text.endsWith("*") && /^\d+\*$/.test(text)) return `${text.slice(0, -1)}+*`;
  if (/^\d+$/.test(text)) return `${text}+`;
  return text;
}

export function formatRange(value: string): string {
  const text = value.trim();
  if (/^\d+$/.test(text)) return `${text}"`;
  return text;
}

export function searchUnits(codex: Codex, query: string, factionId = ""): UnitHit[] {
  const needle = query.trim().toLowerCase();
  const pool = codex.units.filter((unit) => !factionId || unit.factionId === factionId);
  const ranked = pool
    .map((unit) => ({ unit, score: scoreUnit(unit, needle) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.unit.faction.localeCompare(b.unit.faction) ||
        a.unit.name.localeCompare(b.unit.name),
    );
  const limit = needle ? 40 : 80;
  return ranked.slice(0, limit).map(({ unit }) => ({
    id: unit.id,
    name: unit.name,
    factionId: unit.factionId,
    faction: unit.faction,
    role: unit.role,
  }));
}

export function unitDetail(codex: Codex, id: string): UnitDetail | null {
  const unit = codex.units.find((entry) => entry.id === id);
  if (!unit) return null;
  return {
    ...unit,
    stratagems: resolveRules(codex.stratagems, unit.stratagemIds),
    enhancements: resolveRules(codex.enhancements, unit.enhancementIds),
    detachmentAbilities: resolveRules(codex.detachmentAbilities, unit.detachmentAbilityIds),
  };
}

export function groupRules(rules: CodexRule[]): [string, CodexRule[]][] {
  const groups = new Map<string, CodexRule[]>();
  for (const rule of rules) {
    const key = rule.detachment || "Core";
    const list = groups.get(key) ?? [];
    list.push(rule);
    groups.set(key, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function scoreUnit(unit: CodexUnit, needle: string): number {
  if (!needle) return 1;
  const name = unit.name.toLowerCase();
  if (name === needle) return 400;
  if (name.startsWith(needle)) return 300;
  if (name.includes(needle)) return 200;
  const keywords = [...unit.keywords, ...unit.factionKeywords].join(" ").toLowerCase();
  if (keywords.includes(needle)) return 100;
  if (unit.role.toLowerCase().includes(needle)) return 50;
  return 0;
}

function resolveRules(table: Record<string, CodexRule>, ids: string[]): CodexRule[] {
  const rules: CodexRule[] = [];
  for (const id of ids) {
    const rule = table[id];
    if (rule) rules.push(rule);
  }
  return rules;
}
