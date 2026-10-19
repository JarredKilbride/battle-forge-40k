import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatInvulnerable,
  formatRange,
  htmlToText,
  parsePipeCsv,
  type Codex,
  type CodexAbility,
  type CodexRule,
  type CodexUnit,
} from "../src/codex.ts";

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const codex = await buildCodex(path.join(root, "data", "wahapedia"));
  const outFile = path.join(root, "public", "codex.json");
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(codex));
  console.log(
    `Wrote ${codex.units.length} units to ${path.relative(root, outFile)} (${codex.updated})`,
  );
}

export async function buildCodex(directory: string): Promise<Codex> {
  const [
    updatedRows,
    factions,
    sources,
    datasheets,
    models,
    weapons,
    keywords,
    abilityLinks,
    coreAbilities,
    options,
    composition,
    costs,
    leaders,
    stratagems,
    stratagemLinks,
    enhancements,
    enhancementLinks,
    detachmentAbilities,
    detachmentLinks,
  ] = await Promise.all([
    readTable(directory, "Last_update.csv"),
    readTable(directory, "Factions.csv"),
    readTable(directory, "Source.csv"),
    readTable(directory, "Datasheets.csv"),
    readTable(directory, "Datasheets_models.csv"),
    readTable(directory, "Datasheets_wargear.csv"),
    readTable(directory, "Datasheets_keywords.csv"),
    readTable(directory, "Datasheets_abilities.csv"),
    readTable(directory, "Abilities.csv"),
    readTable(directory, "Datasheets_options.csv"),
    readTable(directory, "Datasheets_unit_composition.csv"),
    readTable(directory, "Datasheets_models_cost.csv"),
    readTable(directory, "Datasheets_leader.csv"),
    readTable(directory, "Stratagems.csv"),
    readTable(directory, "Datasheets_stratagems.csv"),
    readTable(directory, "Enhancements.csv"),
    readTable(directory, "Datasheets_enhancements.csv"),
    readTable(directory, "Detachment_abilities.csv"),
    readTable(directory, "Datasheets_detachment_abilities.csv"),
  ]);

  const factionName = new Map(factions.map((row) => [row.id, row.name]));
  const sourceName = new Map(sources.map((row) => [row.id, row.name]));
  const coreAbility = new Map(coreAbilities.map((row) => [row.id, row]));
  const sheetName = new Map(datasheets.map((row) => [row.id, row.name]));
  const modelsByUnit = group(models, "datasheet_id");
  const weaponsByUnit = group(weapons, "datasheet_id");
  const keywordsByUnit = group(keywords, "datasheet_id");
  const abilitiesByUnit = group(abilityLinks, "datasheet_id");
  const optionsByUnit = group(options, "datasheet_id");
  const compositionByUnit = group(composition, "datasheet_id");
  const costsByUnit = group(costs, "datasheet_id");
  const stratagemIds = group(stratagemLinks, "datasheet_id");
  const enhancementIds = group(enhancementLinks, "datasheet_id");
  const detachmentIds = group(detachmentLinks, "datasheet_id");
  const leads = new Map<string, string[]>();
  const ledBy = new Map<string, string[]>();
  for (const row of leaders) {
    pushName(leads, row.leader_id, sheetName.get(row.attached_id));
    pushName(ledBy, row.attached_id, sheetName.get(row.leader_id));
  }

  const units: CodexUnit[] = datasheets
    .filter((row) => row.id && row.name)
    .map((row) => ({
      id: row.id,
      name: row.name,
      factionId: row.faction_id,
      faction: factionName.get(row.faction_id) ?? row.faction_id,
      source: sourceName.get(row.source_id) ?? "",
      role: row.role,
      legend: htmlToText(row.legend),
      loadout: htmlToText(row.loadout),
      transport: htmlToText(row.transport),
      virtual: row.virtual === "true",
      damaged: row.damaged_w,
      damagedDescription: htmlToText(row.damaged_description),
      link: row.link,
      keywords: keywordNames(keywordsByUnit.get(row.id), false),
      factionKeywords: keywordNames(keywordsByUnit.get(row.id), true),
      models: byLine(modelsByUnit.get(row.id)).map((model) => ({
        name: model.name,
        m: model.M,
        t: model.T,
        sv: model.Sv,
        w: model.W,
        ld: model.Ld,
        oc: model.OC,
        invulnerable: formatInvulnerable(model.inv_sv),
        base: model.base_size,
      })),
      weapons: byLine(weaponsByUnit.get(row.id))
        .filter((weapon) => weapon.name.trim())
        .map((weapon) => ({
          name: [weapon.dice.trim(), weapon.name.trim()].filter(Boolean).join(" "),
          kind: weapon.type,
          range: formatRange(weapon.range),
          attacks: weapon.A,
          skill: weapon.BS_WS,
          strength: weapon.S,
          ap: weapon.AP,
          damage: weapon.D,
          rules: htmlToText(weapon.description),
        })),
      abilities: byLine(abilitiesByUnit.get(row.id)).flatMap((link) => {
        const core = coreAbility.get(link.ability_id);
        const name = link.name.trim() || core?.name || "";
        const description = htmlToText(link.description || core?.description || "");
        if (!name && !description) return [];
        const ability: CodexAbility = {
          name: name || "Ability",
          type: link.type,
          model: link.model,
          description,
        };
        return [ability];
      }),
      options: byLine(optionsByUnit.get(row.id))
        .map((option) => htmlToText(option.description))
        .filter(Boolean),
      composition: byLine(compositionByUnit.get(row.id))
        .map((line) => htmlToText(line.description))
        .filter(Boolean),
      points: byLine(costsByUnit.get(row.id)).map((cost) => ({
        label: htmlToText(cost.description),
        cost: cost.cost,
      })),
      leads: unique(leads.get(row.id) ?? []),
      ledBy: unique(ledBy.get(row.id) ?? []),
      stratagemIds: idsOf(stratagemIds.get(row.id), "stratagem_id"),
      enhancementIds: idsOf(enhancementIds.get(row.id), "enhancement_id"),
      detachmentAbilityIds: idsOf(detachmentIds.get(row.id), "detachment_ability_id"),
    }))
    .sort((a, b) => a.faction.localeCompare(b.faction) || a.name.localeCompare(b.name));

  return {
    updated: updatedRows[0]?.last_update ?? "",
    attribution: "powered by Wahapedia",
    factions: factions
      .map((row) => ({ id: row.id, name: row.name, link: row.link }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    stratagems: rulesById(stratagems, (row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      cost: row.cp_cost ? `${row.cp_cost}CP` : "",
      phase: row.phase,
      detachment: row.detachment,
      description: htmlToText(row.description),
    })),
    enhancements: rulesById(enhancements, (row) => ({
      id: row.id,
      name: row.name,
      type: "",
      cost: row.cost,
      phase: "",
      detachment: row.detachment,
      description: htmlToText(row.description),
    })),
    detachmentAbilities: rulesById(detachmentAbilities, (row) => ({
      id: row.id,
      name: row.name,
      type: "",
      cost: "",
      phase: "",
      detachment: row.detachment,
      description: htmlToText(row.description),
    })),
    units,
  };
}

async function readTable(directory: string, name: string) {
  try {
    return parsePipeCsv(await readFile(path.join(directory, name), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Missing ${name} in ${directory}. Download the Wahapedia export first.`);
    }
    throw error;
  }
}

function group(rows: Record<string, string>[], key: string) {
  const grouped = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const id = row[key];
    if (!id) continue;
    const list = grouped.get(id) ?? [];
    list.push(row);
    grouped.set(id, list);
  }
  return grouped;
}

function byLine(rows: Record<string, string>[] | undefined) {
  return [...(rows ?? [])].sort(
    (a, b) => Number(a.line || 0) - Number(b.line || 0),
  );
}

function keywordNames(rows: Record<string, string>[] | undefined, faction: boolean) {
  return unique(
    (rows ?? [])
      .filter((row) => (row.is_faction_keyword === "true") === faction)
      .map((row) => row.keyword.trim())
      .filter(Boolean),
  );
}

function pushName(map: Map<string, string[]>, id: string, name: string | undefined) {
  if (!id || !name) return;
  const list = map.get(id) ?? [];
  list.push(name);
  map.set(id, list);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function idsOf(rows: Record<string, string>[] | undefined, field: string) {
  return unique((rows ?? []).map((row) => row[field]).filter(Boolean));
}

function rulesById(
  rows: Record<string, string>[],
  toRule: (row: Record<string, string>) => CodexRule,
) {
  const table: Record<string, CodexRule> = {};
  for (const row of rows) {
    const rule = toRule(row);
    if (rule.id) table[rule.id] = rule;
  }
  return table;
}
