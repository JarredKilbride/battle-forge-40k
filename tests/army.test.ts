import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { ArmyImportError, parseArmy, parseArmyJson, weaponNeedsReview, weaponProfile } from '../src/army.ts';

const sistersPath = '/Users/jarredkilbride/Downloads/Sisters.json';

test('invalid JSON and an empty object throw ArmyImportError', () => {
  assert.throws(() => parseArmyJson('{'), ArmyImportError);
  assert.throws(() => parseArmyJson('not json'), ArmyImportError);
  assert.throws(() => parseArmy({}), ArmyImportError);
  assert.throws(() => parseArmy({ roster: { forces: [{ selections: [{ type: 'upgrade', name: 'Battle Size' }] }] } }), ArmyImportError);
});

test('a roster parses a unit, keeps the standing 4+ invulnerable, and skips configuration', () => {
  const army = parseArmy(sampleRoster());
  assert.equal(army.units.length, 1);
  assert.equal(army.units.some(unit => unit.name === 'Ghost Squad'), false);
  assert.equal(army.units.some(unit => unit.name === 'Battle Size'), false);
  const unit = army.units[0];
  assert.equal(unit.name, 'Retributor Squad');
  assert.equal(unit.points, 120);
  const model = unit.models.find(entry => entry.name === 'Retributor');
  assert.ok(model);
  assert.equal(model.m, '6"');
  assert.equal(model.t, '3');
  assert.equal(model.sv, '3+');
  assert.equal(model.w, '1');
  assert.equal(model.invuln, 4);
  assert.equal(model.count, 4);

  const bolter = model.weapons.find(weapon => weapon.name === 'Heavy bolter');
  assert.ok(bolter);
  const profile = weaponProfile(unit, model, bolter, { toughness: 5, save: 3, invuln: 4 });
  assert.equal(profile.attacks, 12);
  assert.equal(profile.hit, 4);
  assert.equal(profile.sustained, true);
  assert.equal(profile.lethal, false);
  assert.equal(profile.devastating, false);
  assert.equal(profile.reroll, false);
  assert.equal(profile.toughness, 5);
  assert.equal(profile.save, 3);
  assert.equal(profile.invuln, 4);
  assert.equal(profile.strength, 5);
  assert.equal(profile.ap, -1);
  assert.equal(profile.damage, 2);
  assert.ok(profile.name.length <= 40);

  const variable = model.weapons.find(weapon => weapon.name === "Zealot's vindictor");
  assert.ok(variable);
  const notes = weaponNeedsReview(variable);
  assert.ok(notes.some(note => note.includes('D6')));
  assert.ok(notes.some(note => note.includes('N/A')));
  const variableProfile = weaponProfile(unit, model, variable, { toughness: 4, save: 3, invuln: 0 });
  assert.equal(variableProfile.attacks, 1);
  assert.equal(variableProfile.damage, 1);
  assert.equal(variableProfile.hit, 2);
  assert.equal(variableProfile.reroll, false);

  const bare = parseArmy(sampleRoster().roster);
  assert.equal(bare.name, 'Test');
  assert.equal(bare.units[0].name, 'Retributor Squad');
});

test('parses Sisters.json when the sample roster is present', { skip: !existsSync(sistersPath) }, () => {
  const army = parseArmyJson(readFileSync(sistersPath, 'utf8'));
  assert.equal(army.name, 'Sisters');
  assert.match(army.faction, /Adepta Sororitas/);
  assert.equal(army.units.some(unit => unit.name === 'Battle Size' || unit.name === 'Detachment' || unit.name === 'Show/Hide Options'), false);
  const squad = army.units.find(unit => unit.name === 'Retributor Squad');
  assert.ok(squad);
  const bolter = squad.models.flatMap(model => model.weapons).find(weapon => weapon.name === 'Heavy bolter');
  assert.ok(bolter);
  assert.equal(bolter.count, 4);
  assert.equal(bolter.attacks, '3');
  const retributors = squad.models.find(model => model.name === 'Retributor');
  assert.ok(retributors);
  assert.equal(weaponProfile(squad, retributors, bolter, { toughness: 4, save: 3, invuln: 0 }).attacks, 12);
  const aestred = army.units.find(unit => unit.name.includes('Aestred'));
  assert.ok(aestred);
  const aestredModel = aestred.models.find(model => model.name.includes('Aestred'));
  assert.ok(aestredModel);
  assert.equal(aestredModel.invuln, 4);
  const canoness = army.units.find(unit => unit.name === 'Canoness');
  assert.equal(canoness?.models[0]?.invuln, 4);
});

function sampleRoster(): { roster: Roster } {
  return { roster: rosterBody() };
}

type Roster = ReturnType<typeof rosterBody>;

function rosterBody() {
  return {
    name: 'Test',
    costs: [{ name: 'pts', value: 120 }],
    costLimits: [{ name: 'pts', value: 1000 }],
    forces: [{
      catalogueName: 'Imperium - Adepta Sororitas',
      name: 'Army Roster',
      selections: [
        {
          type: 'upgrade',
          name: 'Battle Size',
          selections: [{
            type: 'unit',
            name: 'Ghost Squad',
            costs: [{ name: 'pts', value: 1 }],
            selections: [{ type: 'model', name: 'Ghost', number: 1, profiles: [unitProfile('Ghost', '6"', '3', '3+', '1')] }],
          }],
        },
        { type: 'upgrade', name: 'Detachment' },
        { type: 'upgrade', name: 'Show/Hide Options', selections: [{ type: 'upgrade', name: 'Legends are visible' }] },
        {
          type: 'unit',
          name: 'Retributor Squad',
          costs: [{ name: 'pts', value: 120 }],
          profiles: [
            ability("The Emperor's Grace", 'Once per battle, at the start of any phase, this model can use this ability. If it does, until the end of the phase, this model has a 2+ invulnerable save.'),
            ability('Invulnerable Save', 'Models in this unit have an invulnerable save of 4+'),
          ],
          selections: [{
            type: 'model',
            name: 'Retributor',
            number: 4,
            profiles: [unitProfile('Retributor', '6"', '3', '3+', '1')],
            selections: [
              weaponUpgrade('Heavy bolter', 4, 'Ranged Weapons', ['36"', '3', '4+', '5', '-1', '2', 'Heavy, Sustained Hits 1']),
              weaponUpgrade("Zealot's vindictor", 1, 'Ranged Weapons', ['12"', 'D6', 'N/A', '4', '0', 'D3', 'Torrent, Twin-linked']),
            ],
          }],
        },
      ],
    }],
  };
}

function unitProfile(name: string, m: string, t: string, sv: string, w: string) {
  return {
    typeName: 'Unit',
    name,
    characteristics: [
      { name: 'M', $text: m },
      { name: 'T', $text: t },
      { name: 'SV', $text: sv },
      { name: 'W', $text: w },
      { name: 'LD', $text: '7+' },
      { name: 'OC', $text: '1' },
    ],
  };
}

function ability(name: string, description: string) {
  return { typeName: 'Abilities', name, characteristics: [{ name: 'Description', $text: description }] };
}

function weaponUpgrade(name: string, number: number, typeName: string, values: string[]) {
  const [range, attacks, skill, strength, ap, damage, keywords] = values;
  return {
    type: 'upgrade',
    name,
    number,
    profiles: [{
      typeName,
      name,
      characteristics: [
        { name: 'Range', $text: range },
        { name: 'A', $text: attacks },
        { name: typeName === 'Melee Weapons' ? 'WS' : 'BS', $text: skill },
        { name: 'S', $text: strength },
        { name: 'AP', $text: ap },
        { name: 'D', $text: damage },
        { name: 'Keywords', $text: keywords },
      ],
    }],
  };
}
