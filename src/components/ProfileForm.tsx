import type { Profile } from "../types";
import { Field } from "./Field";

export function ProfileForm({
  p,
  set,
}: {
  p: Profile;
  set: (p: Profile) => void;
}) {
  const field = (
    key: keyof Profile,
    label: string,
    min: number,
    max: number,
  ) => (
    <Field
      key={key}
      label={label}
      value={p[key] as number}
      min={min}
      max={max}
      onChange={(n) => set({ ...p, [key]: n })}
    />
  );
  return (
    <>
      <label className="field">
        Weapon / unit name
        <input
          maxLength={40}
          value={p.name}
          onChange={(e) => set({ ...p, name: e.target.value })}
        />
      </label>
      <div className="fields">
        {field("attacks", "Attacks", 1, 200)}
        {field("hit", "Hit on (2–6)", 2, 6)}
        {field("strength", "Strength", 1, 30)}
        {field("toughness", "Target toughness", 1, 30)}
        {field("ap", "AP (negative)", -6, 0)}
        {field("save", "Save (7 = none)", 2, 7)}
        {field("invuln", "Invulnerable (0 = none)", 0, 6)}
        {field("damage", "Damage per attack", 1, 20)}
      </div>
      <div className="abilities">
        {(
          [
            ["reroll", "Re-roll hit 1s"],
            ["lethal", "Lethal Hits"],
            ["sustained", "Sustained Hits 1"],
            ["devastating", "Devastating Wounds"],
          ] as const
        ).map(([k, label]) => (
          <label key={k}>
            <input
              type="checkbox"
              checked={p[k]}
              onChange={(e) => set({ ...p, [k]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
    </>
  );
}
