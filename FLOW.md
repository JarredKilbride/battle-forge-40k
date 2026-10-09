# Execution flow: solo local start
_Last updated: 2026-10-09, branch `main`_

## Entry points
- UI lobby, host, one player, hostname `localhost` / `127.0.0.1` / `::1`: **Start solo test** (`src/main.tsx:61`)
- `act` → `sendAction` (`src/main.tsx:42`, `src/api.ts:8`)
- `apply` start / attack / undo-answer (`server/engine.ts:35`, `server/engine.ts:39`, `server/engine.ts:31`)

## Execution order
1. Host creates a room. The lobby still waits for a second player before **Start battle**.
2. On a local hostname, `localTest` (`src/main.tsx:51`) shows **Start solo test** while `players.length < 2`.
3. The click sends `{type:'start', first:<this player>, solo:true}`.
4. `apply` accepts that only for the host, in the lobby, with exactly one player (`server/engine.ts:35`). Status becomes `battle`.
5. In Shooting or Fight, `attack` sets `defender` to the only player (`server/engine.ts:39`), so the same seat rolls saves and applies damage.
6. That seat can approve its own undo (`server/engine.ts:31`, buttons at `src/main.tsx:63`). Two-player games still require the other seat.

## Call graph
```
Start solo test                  (src/main.tsx:61)
 └─ act                          (src/main.tsx:42)
     └─ sendAction               (src/api.ts:8)
         └─ apply                (server/engine.ts:28)
             └─ case 'start'     (server/engine.ts:35)

attack                          (server/engine.ts:39)
 └─ defender = other player, or the only player
```

## Data touched
- Room file under `.local-games/<code>.json` (local dev store): written when the battle starts and on later actions.
- No new localStorage key. `bf.session` is unchanged.

## AI-changed in this session (2026-10-09, solo local start)
| File | Function / area | Change | Why (→ D-<n>) |
|---|---|---|---|
| `server/engine.ts` | `apply` start, attack, undo-answer | Solo start, same-player defender, same-player undo | D-3 |
| `src/main.tsx` | lobby, undo notice | Local **Start solo test** button and solo undo buttons | D-3 |
| `tests/engine.test.ts` | solo and two-player undo | Covered the engine rules | D-3 |
| `DECISIONS.md` | D-3 | Logged the localhost gate | D-3 |
| `FLOW.md` | this file | Logged the solo start path | D-3 |

# Execution flow: army import
_Last updated: 2026-10-09, branch `main`_

## Entry points
- UI lobby: `App` renders compact `ArmyPanel` (`src/main.tsx:60`)
- UI battle tab: `App` renders `ArmyPanel` with Use weapon (`src/main.tsx:69`)
- UI combat, Shooting (phase 2) or Fight (phase 4), when an attack can start: `ArmyAttackPicker` (`src/main.tsx:13`, mounted at `src/main.tsx:66`)
- Restore: `storedArmy` (`src/main.tsx:12`) via `load('bf.army')` (`src/api.ts:9`)

## Execution order
1. Player picks a `.json` file (`src/ArmyPanel.tsx:69`) or pastes text and clicks Import (`src/ArmyPanel.tsx:80`).
2. `importText` (`src/ArmyPanel.tsx:20`) calls `parseArmyJson` (`src/army.ts:59`). Invalid JSON throws `ArmyImportError` and the panel keeps the previous army.
3. `parseArmy` (`src/army.ts:69`) accepts `{roster}` or the roster object, skips configuration upgrades, and builds units.
4. On success, `save('bf.army', army)` (`src/api.ts:10`) then `onArmy` updates React state (`src/main.tsx:53`).
5. Clear calls `localStorage.removeItem('bf.army')` (`src/ArmyPanel.tsx:40`).
6. Use weapon (`src/ArmyPanel.tsx:126`) or a combat weapon select calls `applyArmyWeapon` (`src/main.tsx:54`), which runs `weaponProfile` (`src/army.ts:93`) against the current toughness, save, and invulnerable, then `setProfile`. The Army tab also sets the view to `battle`.
7. `ArmyAttackPicker` shows `weaponNeedsReview` (`src/army.ts:114`) under the selects. Start attack still sends that `Profile` with `{type:'attack'}` (`src/main.tsx:66`). The game API is unchanged.

## Call graph
```
importText                         (src/ArmyPanel.tsx:20)
 └─ parseArmyJson                   (src/army.ts:59)
     └─ parseArmy                   (src/army.ts:69)
         ├─ isConfig                (src/army.ts:290)
         ├─ unitFrom                (src/army.ts:134)
         │   ├─ standingInvuln      (src/army.ts:200)
         │   ├─ modelFrom           (src/army.ts:150)
         │   │   ├─ unitStats       (src/army.ts:212)
         │   │   └─ collectWeapons  (src/army.ts:168)
         │   │       └─ weaponFrom  (src/army.ts:183)
         │   └─ pointsOf            (src/army.ts:277)
         └─ save('bf.army')         (src/api.ts:10)

applyArmyWeapon                    (src/main.tsx:54)
 └─ weaponProfile                   (src/army.ts:93)
     ├─ fixedAttacks                (src/army.ts:243)
     ├─ fixedDamage                 (src/army.ts:248)
     └─ fixedHit                    (src/army.ts:254)

ArmyAttackPicker                   (src/main.tsx:13)
 └─ weaponNeedsReview               (src/army.ts:114)
```

## Data touched
- `localStorage` key `bf.army`: read on load, written after a successful parse, removed by Clear army.
- Game HTTP API and `server/engine.ts`: not read or written by import. An attack still submits one `Profile` through the existing `attack` action.

## AI-changed in this session (2026-10-09)
| File | Function / area | Change | Why (→ D-<n>) |
|---|---|---|---|
| `src/army.ts` | `parseArmy`, `weaponProfile`, `weaponNeedsReview` | Added roster parser and profile mapping | D-1 |
| `src/ArmyPanel.tsx` | `ArmyPanel` | Added import, list, and clear | D-1, D-2 |
| `src/main.tsx` | `App`, `ArmyAttackPicker` | Army tab, lobby import, combat weapon selects | D-1, D-2 |
| `src/style.css` | `.army-panel` and list rules | Appended dark-theme army layout | D-1 |
| `tests/army.test.ts` | roster tests | Covered invalid input, invulnerable save, dice notes, Sisters.json | D-1 |
| `DECISIONS.md` | D-1, D-2 | Logged data shape and localStorage | D-1, D-2 |
| `FLOW.md` | this file | Logged army import flow | D-1, D-2 |
