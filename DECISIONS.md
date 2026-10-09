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

## D-4: Animate digital dice on this browser only  (2026-10-09, branch `main`)
**Context:** Digital rolls appear as finished numbers the moment the server answers. The user wants those automatic rolls to look like dice tumbling, and a way to turn that off.
**Decision:** After a digital result arrives, `DiceRow` tumbles pip faces for a short time, then settles on the server faces. The tumble is skipped for physical dice, history, and dice already on screen when the panel mounts. A checkbox, “Animate digital rolls”, is stored in `localStorage` key `bf.dice-motion`. Missing key follows `prefers-reduced-motion` (off when the OS asks for less motion, otherwise on). The server roll is unchanged.
**Alternatives considered:** Spin dice before the server responds — rejected because the shown face would not be the real result until the reply, and a slow reply would hold fake dice. A 3D dice library — rejected because pip faces and a CSS tumble stay inside the existing stylesheet. Store the switch on the game — rejected because each player chooses motion on their own device.
**Reasons:** User asked for a visual automatic roll and a disable switch. The engine stays the source of the faces.
**Consequences / follow-ups:** A pool already visible on refresh does not replay. Turning the switch off mid-tumble snaps to the real faces. More than a few dozen dice still tumble together on one timer.
**Files:** `src/components/DiceRow.tsx`, `src/components/CombatPanel.tsx`, `src/style.css`

## D-5: Explain hits, wounds, and saves on the step itself  (2026-10-09, branch `main`)
**Context:** The attack strip shows the words Hits, Wounds, Saves, and Damage. The only explanation sits inside a collapsed “Explain this roll” control, and it describes the current step alone.
**Decision:** Each step shows a short line under its name: what that roll is. Hits, wounds, and saves stay visible together. Damage gets the same treatment so the strip stays even. The collapsed help still holds the wound chart and the natural-1 rule.
**Alternatives considered:** One sentence under the strip that changes with the selected step — rejected because the other steps would stay unexplained until you reach them. Stuffing the full chart into each cell — rejected because four narrow columns cannot hold it.
**Reasons:** User asked for text under hits, wounds, and saves that explains what each one is.
**Consequences / follow-ups:** The hint is display copy only. It does not change the roll.
**Files:** `src/components/CombatPanel.tsx`, `src/style.css`

## D-6: Keep the dice tumble inside the grid padding  (2026-10-09, branch `main`)
**Context:** `.dice-grid` uses `overflow: auto` so a large pool can scroll. The tumble lifts and rotates each die, and that transformed box is bigger than the 40px cell, so the grid grows a scrollbar and clips the motion.
**Decision:** Pad the grid enough that a 16° turn and a 5px lift stay inside the padding edge. A pool taller than the max height can still scroll.
**Alternatives considered:** Turn overflow off — rejected because a large attack pool would run off the panel. Shrink the tumble to nothing — rejected because the motion is the point of the animation. Clip with `overflow: hidden` — rejected because that cuts the dice off, which is the bug.
**Reasons:** User saw the animation clipped and a scrollbar appear during the roll.
**Consequences / follow-ups:** A few dozen dice still scroll once they pass the max height. The tumble itself should not be what opens the scrollbar.
**Files:** `src/style.css`

## D-7: Say how the damage total was reached  (2026-10-09, branch `main`)
**Context:** The damage card shows a number, the words “potential damage”, and a count of failed saves and devastating wounds. A player cannot see how the hits, the save, and the weapon’s damage became that number.
**Decision:** The card keeps the total, then states the hit count, which save was used, how many saves failed or were stopped, and the multiplication (failed saves and devastating wounds × damage each). Zero devastating wounds and unused abilities are left out. The same card remains after the attack is marked done.
**Alternatives considered:** Only lengthen the paragraph under the button — rejected because the user pointed at the result card. Add new fields on the game — rejected because hits, wounds, failed saves, devastating wounds, and the profile are already on the attack.
**Reasons:** User asked for more context in that card so a player can see what was done.
**Consequences / follow-ups:** The card is display copy. Allocation is still done on the tabletop.
**Files:** `src/components/CombatPanel.tsx`, `src/style.css`
