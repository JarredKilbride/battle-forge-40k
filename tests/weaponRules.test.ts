import assert from "node:assert/strict";
import test from "node:test";
import { explainWeaponRule, splitWeaponRules } from "../src/weaponRules.ts";

test("weapon rules split on commas and keep each ability whole", () => {
  assert.deepEqual(splitWeaponRules("blast, twin-linked"), ["blast", "twin-linked"]);
  assert.deepEqual(splitWeaponRules(" rapid fire 1 , lethal hits "), ["rapid fire 1", "lethal hits"]);
  assert.deepEqual(splitWeaponRules(""), []);
  assert.deepEqual(splitWeaponRules("  "), []);
});

test("blast and twin-linked explain the shared ability", () => {
  const blast = explainWeaponRule("blast");
  assert.equal(blast.shared, true);
  assert.match(blast.text, /every 5 models/);
  assert.match(blast.text, /Engagement Range/);

  const linked = explainWeaponRule("twin-linked");
  assert.equal(linked.title, "Twin-linked");
  assert.match(linked.text, /re-roll the Wound roll/);
  assert.match(linked.text, /Hit roll/);
  assert.equal(explainWeaponRule("Twin Linked").text, linked.text);
});

test("numbered and anti abilities keep the printed value", () => {
  assert.match(explainWeaponRule("rapid fire 1").text, /Add 1 to this weapon’s Attacks/);
  assert.match(explainWeaponRule("sustained hits d3").text, /scores d3 extra hits/);
  assert.match(explainWeaponRule("melta 2").text, /Add 2 to this weapon’s Damage/);
  const anti = explainWeaponRule("anti-infantry 4+");
  assert.equal(anti.title, "Anti-infantry 4+");
  assert.match(anti.text, /Infantry keyword/);
  assert.match(anti.text, /4\+/);
});

test("a weapon-specific name points back at the datasheet", () => {
  const note = explainWeaponRule("bubblechukka");
  assert.equal(note.shared, false);
  assert.match(note.text, /not a shared weapon ability/);
});
