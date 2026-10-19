import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  formatInvulnerable,
  formatRange,
  htmlToText,
  parsePipeCsv,
  searchUnits,
  unitDetail,
  type Codex,
} from "../src/codex.ts";

const catalog: Codex = {
  updated: "2026-06-13",
  attribution: "powered by Wahapedia",
  factions: [{ id: "SM", name: "Space Marines", link: "" }],
  stratagems: {
    s1: {
      id: "s1",
      name: "Armour of Contempt",
      type: "Battle Tactic",
      cost: "1CP",
      phase: "Shooting phase",
      detachment: "Gladius",
      description: "Improve the save.",
    },
  },
  enhancements: {},
  detachmentAbilities: {},
  units: [
    {
      id: "1",
      name: "Intercessor Squad",
      factionId: "SM",
      faction: "Space Marines",
      source: "Codex",
      role: "Battleline",
      legend: "",
      loadout: "bolt rifle",
      transport: "",
      virtual: false,
      damaged: "",
      damagedDescription: "",
      link: "https://wahapedia.ru/example",
      keywords: ["INFANTRY", "BATTLELINE"],
      factionKeywords: ["ADEPTUS ASTARTES"],
      models: [],
      weapons: [],
      abilities: [],
      options: [],
      composition: [],
      points: [],
      leads: [],
      ledBy: ["Captain"],
      stratagemIds: ["s1", "missing"],
      enhancementIds: [],
      detachmentAbilityIds: [],
    },
    {
      id: "2",
      name: "Captain",
      factionId: "SM",
      faction: "Space Marines",
      source: "",
      role: "Characters",
      legend: "",
      loadout: "",
      transport: "",
      virtual: false,
      damaged: "",
      damagedDescription: "",
      link: "",
      keywords: ["CHARACTER"],
      factionKeywords: [],
      models: [],
      weapons: [],
      abilities: [],
      options: [],
      composition: [],
      points: [],
      leads: ["Intercessor Squad"],
      ledBy: [],
      stratagemIds: [],
      enhancementIds: [],
      detachmentAbilityIds: [],
    },
  ],
};

test("pipe CSV keeps quoted newlines and pipes", () => {
  const rows = parsePipeCsv('id|name|text\n1|Guard|"line one\nline | two"\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Guard");
  assert.equal(rows[0].text, "line one\nline | two");
  const inches = parsePipeCsv('id|M|T\n1|6"|4\n');
  assert.equal(inches[0].M, '6"');
  assert.equal(inches[0].T, "4");
});

test("HTML ability text becomes plain text", () => {
  assert.equal(htmlToText("<b>WHEN:</b> Your<br>Shooting phase."), "WHEN: Your\nShooting phase.");
  assert.equal(htmlToText("A &amp; B"), "A & B");
});

test("saves and ranges get their tabletop marks", () => {
  assert.equal(formatInvulnerable("5"), "5+");
  assert.equal(formatInvulnerable("-"), "");
  assert.equal(formatInvulnerable("4*"), "4+*");
  assert.equal(formatRange("24"), '24"');
  assert.equal(formatRange("Melee"), "Melee");
});

test("search prefers the unit name and can filter by faction", () => {
  const hits = searchUnits(catalog, "intercessor");
  assert.equal(hits[0]?.name, "Intercessor Squad");
  assert.equal(searchUnits(catalog, "infantry")[0]?.name, "Intercessor Squad");
  assert.deepEqual(
    searchUnits(catalog, "", "NONE").map((hit) => hit.id),
    [],
  );
});

test("built catalog resolves Custodian Guard as plain text", () => {
  const codex = JSON.parse(readFileSync(new URL("../public/codex.json", import.meta.url), "utf8")) as Codex;
  const hit = searchUnits(codex, "Custodian Guard", "AC")[0];
  assert.equal(hit?.name, "Custodian Guard");
  const detail = unitDetail(codex, hit.id);
  assert.ok(detail);
  assert.equal(detail.models[0]?.m, '6"');
  assert.equal(detail.models[0]?.t, "6");
  assert.equal(detail.models[0]?.sv, "2+");
  assert.ok(detail.weapons.some((weapon) => weapon.range === '24"'));
  assert.equal(JSON.stringify(detail.abilities).includes("<div"), false);
});

test("unit detail joins a stratagem and drops an unknown id", () => {
  const detail = unitDetail(catalog, "1");
  assert.ok(detail);
  assert.equal(detail.stratagems.length, 1);
  assert.equal(detail.stratagems[0]?.name, "Armour of Contempt");
  assert.equal(detail.ledBy[0], "Captain");
  assert.equal(unitDetail(catalog, "missing"), null);
});
