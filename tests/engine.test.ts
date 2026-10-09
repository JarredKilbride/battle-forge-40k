import assert from 'node:assert/strict';
import test from 'node:test';
import { apply, createGame, GameError, join } from '../server/engine.ts';
import type { Profile } from '../src/types.ts';

const weapon: Profile = {
  name: 'Boltgun',
  attacks: 2,
  hit: 3,
  strength: 4,
  toughness: 4,
  ap: 0,
  save: 3,
  invuln: 0,
  damage: 1,
  lethal: false,
  sustained: false,
  devastating: false,
  reroll: false,
};

test('one player cannot start unless the action is a solo test', () => {
  const game = createGame('SOLOTEST01', 'Tester', 'token-1');
  assert.throws(() => apply(game, game.host, { type: 'start', first: game.host }), (error: unknown) => {
    return error instanceof GameError && error.message === 'Both players must join; only the host can start.';
  });
  assert.equal(game.status, 'lobby');
});

test('a solo test lets the only player resolve hits, saves, damage, and undo', () => {
  const game = createGame('SOLOTEST02', 'Tester', 'token-1');
  const id = game.host;
  apply(game, id, { type: 'start', first: id, solo: true });
  assert.equal(game.status, 'battle');
  assert.match(game.history.at(-1)?.text ?? '', /plays both sides/);

  apply(game, id, { type: 'next' });
  apply(game, id, { type: 'next' });
  assert.equal(game.phase, 2);

  apply(game, id, { type: 'attack', profile: weapon });
  assert.equal(game.attack?.attacker, id);
  assert.equal(game.attack?.defender, id);

  apply(game, id, { type: 'roll', mode: 'physical', faces: [6, 6] });
  apply(game, id, { type: 'roll', mode: 'physical', faces: [6, 6] });
  apply(game, id, { type: 'roll', mode: 'physical', faces: [1, 1] });
  assert.equal(game.attack?.stage, 'damage');
  apply(game, id, { type: 'damage' });
  assert.equal(game.attack?.stage, 'done');

  apply(game, id, { type: 'note', text: 'Solo marker' });
  apply(game, id, { type: 'undo-request' });
  apply(game, id, { type: 'undo-answer', accept: true });
  assert.equal(game.undo, null);
  assert.match(game.history.at(-1)?.text ?? '', /approved undo/);
  assert.equal(game.history.some(entry => entry.text === 'Tester: Solo marker'), true);
});

test('two players still need the other seat to answer undo', () => {
  const game = createGame('SOLOTEST03', 'Host', 'token-1');
  const opponent = join(game, 'Opponent', 'token-2');
  apply(game, game.host, { type: 'start', first: game.host });
  apply(game, game.host, { type: 'note', text: 'Keep this' });
  apply(game, game.host, { type: 'undo-request' });
  assert.throws(() => apply(game, game.host, { type: 'undo-answer', accept: true }), GameError);
  apply(game, opponent, { type: 'undo-answer', accept: false });
  assert.equal(game.undo, null);
  assert.equal(game.attack, null);
});
