# Decisions

## D-1: Normalise New Recruit rosters into an army model  (2026-10-09, branch `main`)
**Context:** Players type weapon profiles by hand. A New Recruit / BattleScribe roster is a nested selection tree (`roster.forces[].selections`) with configuration upgrades, units, models, and weapon profiles whose characteristics are strings (`D6`, `4+`, `N/A`). The combat engine only accepts a fixed `Profile`.
**Decision:** `parseArmy` walks that tree into `Army` / `ArmyUnit` / `ArmyModel` / `ArmyWeapon`. Configuration upgrades named `Battle Size`, `Detachment`, and `Show/Hide Options` are skipped with their children. A root `model` is its own unit. Standing invulnerable saves come only from an Abilities profile named exactly `Invulnerable Save`, then inherit onto models that lack one. `weaponProfile` turns a weapon into a legal `Profile` and keeps the defender toughness, save, and invulnerable already on the form. Variable dice and unsupported keywords stay as review notes instead of being guessed.
**Alternatives considered:** Feed the raw roster JSON into the roller — rejected because `profileOf` requires integers and would reject `D6` / `N/A`. Map every keyword onto the four booleans — rejected because the roller only applies Lethal Hits, Sustained Hits, Devastating Wounds, and re-roll hit 1s, and Twin-linked is not that re-roll.
**Reasons:** User specified this shape and these combat limits. The server engine stays unchanged.
**Consequences / follow-ups:** Variable attacks and damage import as 1 until the player types the rolled total. Keywords other than the three wound rules are listed and not applied. Sustained Hits of any value sets the Sustained Hits 1 flag the roller already has.
**Files:** `src/army.ts`, `src/ArmyPanel.tsx`, `src/main.tsx`, `tests/army.test.ts`

## D-2: Keep the imported army in localStorage, not game state  (2026-10-09, branch `main`)
**Context:** Saved weapon profiles already live on this browser (`bf.profiles`). The shared game API and `server/engine.ts` were not to change.
**Decision:** A successful import writes the normalised `Army` to `localStorage` key `bf.army`. Clear removes that key. The opponent never receives the roster. Starting an attack still sends one `Profile` through the existing `attack` action.
**Alternatives considered:** Store the roster on the game object so both players see the list — rejected because that changes the game API and the server engine. Re-parse the roster file on every page load — rejected because only a successful parse is saved, so a bad file cannot wipe `bf.army`.
**Reasons:** User chose device-local import. Same pattern as `bf.profiles` and `bf.session`.
**Consequences / follow-ups:** Each player imports on their own device. Refresh keeps the army. Clearing the site data drops it.
**Files:** `src/ArmyPanel.tsx`, `src/main.tsx` (`src/api.ts` `save` / `load` reused, not changed)

## D-3: Solo test start on localhost only  (2026-10-09, branch `main`)
**Context:** Starting a battle requires two joined players. Local testing on port 5173 has one browser, so the host cannot leave the lobby. Attacks also assign saves and damage to the other player, and undo needs that player’s approval.
**Decision:** On `localhost`, `127.0.0.1`, or `::1`, the host can send `{type:'start', solo:true}`. The engine accepts that only while the room has exactly one player. That player is the defender, and they may approve their own undo. A normal start still requires two players.
**Alternatives considered:** Allow one-player start on the deployed site — rejected because the user asked for local testing and the live game stays 1 v 1. Insert a fake second player — rejected because that seat has no token on this browser, so saves, damage, and undo would stall. Gate the rule with a server-only hostname check — rejected because the local and Netlify handlers share `apply`.
**Reasons:** User needs one device to walk a battle on the local server. The explicit `solo` flag keeps the two-player start rule intact.
**Consequences / follow-ups:** A crafted request can still solo-start a one-player room on Netlify; the button is not shown there. Restart `pnpm dev` after this engine change so the running server loads it. A second player cannot join after the battle has started.
**Files:** `server/engine.ts`, `src/main.tsx`, `tests/engine.test.ts`
