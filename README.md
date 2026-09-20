# Battle Forge

A React + Vite tabletop companion for two players using their own phones. Built for Netlify with server-side game state in Netlify Blobs and a bloodied-metal theme.

## Play

1. Enter your name and create a game.
2. Your opponent joins using the room code, invite link or QR code.
3. The host chooses who goes first. Follow the phase checklist and expand explanations when needed.
4. In Shooting and Fight, enter or load a weapon. The attacker resolves hits and wounds; the defender resolves saves and acknowledges damage.
5. Track CP and VP manually. Use history for tabletop notes and opponent-approved undo.

The battle round advances after **both** players complete their turns. Games remain accessible for seven days; refreshing the same browser restores its saved seat. Keep browser storage: the room code alone cannot reclaim a full room. Saved weapon profiles are local to each browser.

## Local development

Requires Node 22.12 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Use a separate browser profile or private window for the second player. Local development uses the same game API with files in the ignored `.local-games` directory. Production uses Netlify Blobs.

```sh
npm test
npm run build
```

`npm run preview` previews the built frontend only; use `npm run dev` for working multiplayer locally.

## Deploy to Netlify

Import this GitHub repository into Netlify. Leave the base directory blank. The included `netlify.toml` specifies:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node version: 22

Deploy through Netlify's Git integration so both the frontend and function are built. Uploading only `dist` will not include the game API. The function uses Netlify's automatically supplied Blobs credentials; no separate database account or frontend secret is required. After deployment, create a room on one phone, join from the other, and verify a phase change and dice result on both devices.

## How synchronization works

The browser polls every 2.5 seconds while visible and every 12 seconds while hidden. The server authenticates device tokens, checks roles, generates digital dice, validates all actions and persists shared state. Strongly consistent conditional writes reject conflicting updates. Action IDs deduplicate retries, preventing the same submitted roll from being applied twice. Tokens are hashed before storage and excluded from shared game responses.

Rooms stop accepting requests seven days after creation; this is access expiry, not automatic deletion of stored blobs. The last 250 history entries are retained. Hosting, Functions and Blobs usage count against your Netlify plan.

## Rules scope

Phase explanations are a concise guide to the [June 2026 eleventh-edition core rules](https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf), not a replacement for current rules, FAQs, army rules or mission packs.

The combat helper supports fixed attacks/damage, unmodified hit/wound targets, AP, invulnerable saves, hit re-rolls of 1, Lethal Hits, Sustained Hits 1 and Devastating Wounds. Physical dice are entered as final faces. Unsupported modifiers and abilities must be resolved on the tabletop. Damage displayed is potential damage before per-model allocation, defensive abilities and overkill. Resolve normal damage before Devastating Wounds; do not spill excess from an individual attack across models.

Fight eligibility, fight order, unit activation, movement, charges, start/end-of-turn abilities and mission scoring remain player-managed. Checklist ticks are reminders, not automatic rules enforcement. CP and VP never change automatically.

## Verification

Tests cover two-player turn progression, action ownership, critical-hit interactions, saves, opponent-approved undo, invalid dice, authentication, stale updates, concurrent writes and retry deduplication. Production build includes TypeScript checks.

Future work: mission-specific scoring, richer unit activation guidance, optional modifiers, profile export/import, and more than two players. Player ordering is represented separately from player data to support that extension.

Unofficial fan companion. Not affiliated with Games Workshop. The background is AI-generated. Legacy `app.js`, `styles.css` and the root background may remain from the original prototype; Vite uses `src/` and `public/`.
