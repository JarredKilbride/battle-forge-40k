import assert from "node:assert/strict";
import test from "node:test";
import { codexToArmyUnit, draftArmy, markedSkill, pointsLimit } from "../src/codexArmy.ts";
import type { CodexUnit } from "../src/codex.ts";

const prosecutors: CodexUnit = {
  id: "p",
  name: "Prosecutors",
  factionId: "AS",
  faction: "Adepta Sororitas",
  source: "",
  role: "Battleline",
  legend: "",
  loadout: "",
  transport: "",
  virtual: false,
  damaged: "",
  damagedDescription: "",
  link: "",
  keywords: [],
  factionKeywords: [],
  models: [
    {
      name: "Prosecutor",
      m: '6"',
      t: "3",
      sv: "3+",
      w: "1",
      ld: "6+",
      oc: "2",
      invulnerable: "6+",
      base: "32mm",
    },
  ],
  weapons: [
    {
      name: "Boltgun",
      kind: "Ranged",
      range: '24"',
      attacks: "1",
      skill: "3",
      strength: "4",
      ap: "0",
      damage: "1",
      rules: "rapid fire 1",
    },
    {
      name: "Close combat weapon",
      kind: "Melee",
      range: "Melee",
      attacks: "2",
      skill: "3+",
      strength: "3",
      ap: "0",
      damage: "1",
      rules: "",
    },
  ],
  abilities: [],
  options: [],
  composition: [],
  points: [
    { label: "4 models", cost: "50" },
    { label: "9 models", cost: "100" },
  ],
  leads: [],
  ledBy: [],
  stratagemIds: [],
  enhancementIds: [],
  detachmentAbilityIds: [],
};

test("a bare ballistic skill becomes a plus save the roller can read", () => {
  assert.equal(markedSkill("3"), "3+");
  assert.equal(markedSkill("3+"), "3+");
  assert.equal(markedSkill("N/A"), "N/A");
});

test("a points row sets the model count and the unit cost", () => {
  const unit = codexToArmyUnit(prosecutors, 1);
  assert.equal(unit.points, 100);
  assert.equal(unit.models[0]?.count, 9);
  assert.equal(unit.models[0]?.invuln, 6);
  assert.equal(unit.models[0]?.weapons[0]?.skill, "3+");
  assert.equal(unit.models[0]?.weapons[0]?.kind, "ranged");
  assert.equal(unit.models[0]?.weapons[1]?.kind, "melee");
});

test("weapons stay on the first profile when a datasheet has two", () => {
  const unit = codexToArmyUnit(
    {
      ...prosecutors,
      models: [
        prosecutors.models[0],
        { ...prosecutors.models[0], name: "Sister Superior" },
      ],
    },
    0,
  );
  assert.equal(unit.models[0]?.weapons.length, 2);
  assert.equal(unit.models[1]?.weapons.length, 0);
  assert.equal(unit.models[1]?.count, 1);
});

test("a draft army adds the unit costs", () => {
  const army = draftArmy("Order", "Adepta Sororitas", 2000, [
    codexToArmyUnit(prosecutors, 0),
    codexToArmyUnit(prosecutors, 0),
  ]);
  assert.equal(army.points, 100);
  assert.equal(army.limit, 2000);
  assert.equal(army.units.length, 2);
});

test("a points limit can be any whole number up to the save cap", () => {
  assert.equal(pointsLimit(1500), 1500);
  assert.equal(pointsLimit("500"), 500);
  assert.equal(pointsLimit(20000), 20000);
  assert.equal(pointsLimit(0), 2000);
  assert.equal(pointsLimit(20001), 2000);
  assert.equal(pointsLimit("15.5"), 2000);
  assert.equal(pointsLimit(""), 2000);
});
