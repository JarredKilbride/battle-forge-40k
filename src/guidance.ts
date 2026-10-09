export const rulesUrl =
  "https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf";
// Concise paraphrases of the June 2026 core rules. Mission/codex updates remain manual.
export const guidance = [
  {
    title: "Gather your forces",
    intro: "Resolve turn-start effects, then command your army.",
    tasks: [
      "Turn-start and phase-start effects",
      "Each player adds 1 CP",
      "Battle-shock checks",
      "Command abilities and mission scoring",
    ],
    help: "Both players gain one CP. Test units already battle-shocked or at/below half-strength. Then resolve Command abilities and end-of-phase effects. Update CP yourself below.",
    page: 30,
  },
  {
    title: "Move your units",
    intro: "Work through your units one at a time.",
    tasks: [
      "Phase-start effects",
      "Move eligible units",
      "Place eligible reserves",
      "End-of-phase effects",
    ],
    help: "Choose the appropriate move for each unit. Check its Move characteristic, terrain, coherency and enemy engagement before moving. Consult reserves restrictions before placing arrivals.",
    page: 32,
  },
  {
    title: "Choose a unit to shoot",
    intro: "Select an eligible weapon and agree on its target.",
    tasks: [
      "Check eligible shooters and targets",
      "Resolve all chosen attacks",
      "End-of-phase effects",
    ],
    help: "Check visibility, range and weapon abilities before starting. Resolve hits, wounds, saves and damage. Repeat for other weapons; finish the phase separately.",
    page: 34,
  },
  {
    title: "Declare your charges",
    intro: "Resolve each eligible charging unit separately.",
    tasks: [
      "Phase-start effects",
      "Declare unit and roll charge distance",
      "Choose reachable targets and move",
      "End-of-phase effects",
    ],
    help: "Declare an eligible unit, roll 2D6, then decide whether to attempt its charge move. Check legal targets and movement restrictions in the core rules.",
    page: 36,
  },
  {
    title: "Both players fight",
    intro: "Agree which unit fights next before starting an attack.",
    tasks: [
      "Phase-start effects",
      "Resolve pile-in moves",
      "Resolve Fights First and remaining combats",
      "Consolidate and resolve end effects",
      "Turn-end effects and mission scoring",
    ],
    help: "Pile in, resolve fights, then consolidate. Follow the alternating selection sequence, beginning Fights First with the active player. Both players can start attacks here.",
    page: 38,
  },
];
