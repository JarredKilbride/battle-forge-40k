export type WeaponRuleNote = {
  title: string;
  text: string;
  shared: boolean;
};

const SHARED: Record<string, string> = {
  assault:
    "If this unit Advanced, it can still shoot this weapon, but subtract 1 from the Hit roll. After an Advance it can shoot only weapons with Assault.",
  blast:
    "Add 1 to the number of attacks for every 5 models in the target unit. This weapon cannot target a unit that is within Engagement Range of any unit from your army.",
  "devastating wounds":
    "A Critical Wound (normally an unmodified Wound roll of 6) inflicts mortal wounds equal to this weapon’s Damage instead of a normal wound. Armour and invulnerable saves are not taken against those mortal wounds.",
  "extra attacks":
    "The bearer can fight with this weapon in addition to the other melee weapon it chooses.",
  hazardous:
    "After the unit has finished shooting or fighting, roll one D6 for each Hazardous weapon a model used. Each roll of 1 inflicts 3 mortal wounds on that model’s unit. Wounds from a Character’s own Hazardous weapon are allocated to that Character.",
  heavy: "Add 1 to the Hit roll if the bearer’s unit Remained Stationary this turn.",
  "ignores cover": "The target does not get the Benefit of Cover against this weapon.",
  "indirect fire":
    "This weapon can target a unit the bearer cannot see. If the target is not visible, subtract 1 from the Hit roll and the target has the Benefit of Cover against that attack.",
  lance: "If the bearer made a Charge move this turn, add 1 to the Wound roll.",
  "lethal hits":
    "A Critical Hit (normally an unmodified Hit roll of 6) wounds the target automatically. Do not roll to wound for that hit.",
  "one shot": "The bearer can shoot this weapon only once per battle.",
  pistol:
    "A unit within Engagement Range of enemy units can still shoot, but only with Pistols, and only at those enemy units.",
  precision:
    "When this weapon wounds a unit with a Leader attached, you can allocate the attack to a visible Character model in that unit.",
  psychic:
    "This marks the weapon as Psychic so other rules can refer to it. On its own it does not change the Hit roll, Wound roll, or save.",
  torrent: "Attacks with this weapon hit automatically. Do not roll to hit.",
  "twin linked": "You can re-roll the Wound roll. This does not let you re-roll the Hit roll.",
};

const NUMBERED: Record<string, (value: string) => string> = {
  "rapid fire": (value) =>
    `Add ${value} to this weapon’s Attacks if the target is within half its Range.`,
  "sustained hits": (value) =>
    `Each Critical Hit (normally an unmodified Hit roll of 6) scores ${value} extra hits. Those extra hits do not score further hits.`,
  melta: (value) => `Add ${value} to this weapon’s Damage if the target is within half its Range.`,
};

export function splitWeaponRules(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function explainWeaponRule(token: string): WeaponRuleNote {
  const title = titleOf(token);
  const key = normalize(token);
  const shared = SHARED[key];
  if (shared) return { title, text: shared, shared: true };

  const amount = key.match(/^(rapid fire|sustained hits|melta) (\d+|d\d(?:\+\d+)?)$/);
  if (amount) {
    const write = NUMBERED[amount[1]];
    if (write) return { title, text: write(amount[2]), shared: true };
  }

  const anti = key.match(/^anti (.+) (\d+)\+$/);
  if (anti) {
    const keyword = titleOf(anti[1]);
    return {
      title,
      text: `Against a unit with the ${keyword} keyword, an unmodified Wound roll of ${anti[2]}+ is a Critical Wound. A Critical Wound always wounds, even when the Strength and Toughness chart would have needed a higher roll, and it counts for Devastating Wounds.`,
      shared: true,
    };
  }

  return {
    title,
    text: "This name is printed on the weapon and is not a shared weapon ability. Read this unit’s abilities, or that army’s rules, for what it does.",
    shared: false,
  };
}

function normalize(token: string): string {
  return token.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function titleOf(token: string): string {
  return token
    .trim()
    .split(/\s+/)
    .map((word) => {
      const [head, ...rest] = word.toLowerCase().split("-");
      const capped = head ? head.charAt(0).toUpperCase() + head.slice(1) : head;
      return [capped, ...rest].join("-");
    })
    .join(" ");
}
