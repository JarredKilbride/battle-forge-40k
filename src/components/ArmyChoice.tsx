import type { Army } from "../army";

export function ArmyChoice({
  army,
  armies,
  onSelect,
}: {
  army: Army | null;
  armies: Army[];
  onSelect: (name: string) => void;
}) {
  const units = army?.units.length ?? 0;
  return (
    <label className="field army-choice">
      Army for this battle
      <select value={army?.name ?? ""} onChange={(event) => onSelect(event.target.value)}>
        <option value="">Choose an army</option>
        {armies.map((entry) => (
          <option key={entry.name} value={entry.name}>
            {entry.name} · {entry.points} pts
          </option>
        ))}
      </select>
      {army ? (
        <small>
          {army.faction ? `${army.faction} · ` : ""}
          {units === 1 ? "1 unit" : `${units} units`}
        </small>
      ) : (
        <small>Pick a saved army, or import a roster.</small>
      )}
    </label>
  );
}
