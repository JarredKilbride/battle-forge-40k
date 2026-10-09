import {
  weaponNeedsReview,
  type Army,
  type ArmyModel,
  type ArmyUnit,
  type ArmyWeapon,
} from "../army";

export type ArmyPick = {
  unit: ArmyUnit;
  model: ArmyModel;
  weapon: ArmyWeapon;
};

export function ArmyAttackPicker({
  army,
  phase,
  unitIndex,
  pick,
  onUnit,
  onWeapon,
}: {
  army: Army;
  phase: number;
  unitIndex: string;
  pick: ArmyPick | null;
  onUnit: (index: string) => void;
  onWeapon: (unit: ArmyUnit, model: ArmyModel, weapon: ArmyWeapon) => void;
}) {
  const kind = phase === 2 ? "ranged" : "melee";
  const unit = unitIndex !== "" ? army.units[Number(unitIndex)] : undefined;
  const weapons = unit
    ? unit.models.flatMap((model, modelIndex) =>
        model.weapons.flatMap((weapon, weaponIndex) =>
          weapon.kind === kind
            ? [{ model, weapon, key: `${modelIndex}:${weaponIndex}` }]
            : [],
        ),
      )
    : [];
  const selected =
    pick && unit && pick.unit === unit
      ? weapons.find(
          (entry) => entry.weapon === pick.weapon && entry.model === pick.model,
        )
      : undefined;
  const notes = selected && pick ? weaponNeedsReview(pick.weapon) : [];
  return (
    <div className="army-pick">
      <label className="field">
        Army unit
        <select
          value={unit ? unitIndex : ""}
          onChange={(e) => onUnit(e.target.value)}
        >
          <option value="">Choose a unit</option>
          {army.units.map((entry, index) => (
            <option key={`${entry.name}-${index}`} value={String(index)}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {kind === "ranged" ? "Ranged weapon" : "Melee weapon"}
        <select
          value={selected?.key ?? ""}
          onChange={(e) => {
            const found = weapons.find((entry) => entry.key === e.target.value);
            if (found && unit) onWeapon(unit, found.model, found.weapon);
          }}
        >
          <option value="">Choose a weapon</option>
          {weapons.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {unit && unit.models.length > 1 ? `${entry.model.name}: ` : ""}
              {entry.weapon.name}
              {entry.weapon.count > 1 ? ` ×${entry.weapon.count}` : ""}
            </option>
          ))}
        </select>
      </label>
      {unit && !weapons.length && (
        <p>This unit has no {kind} weapons in the roster.</p>
      )}
      {notes.length > 0 && (
        <ul className="army-notes">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
