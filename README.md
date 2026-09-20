# Battle Forge — 40K Combat Roller

A mobile-friendly, grimdark tabletop combat roller built with HTML, CSS and JavaScript. No build step or backend is required.

## Run locally

Open `index.html` in a browser. Keep `app.js`, `styles.css`, and `blooded-metal.png` alongside it.

## Features

- Attacks, hit target, Strength, Toughness, AP, armour save, invulnerable save, and fixed damage.
- Hit re-rolls of 1, Lethal Hits, Sustained Hits 1, and Devastating Wounds.
- Automatic hit → wound → save → damage sequence.
- Simple phase and round tracker.

## Scope

This is a simplified companion, not a complete rules engine. Damage is a raw total before model allocation, overkill, damage reduction, or Feel No Pain. The phase tracker advances its round after each Fight phase; it does not track both players' turns separately. Consult your current rules for interactions not covered here.

Google Fonts are optional network-loaded fonts, with system-font fallbacks. The bloodied-metal background is AI-generated.

Unofficial fan tool. Not affiliated with Games Workshop.
