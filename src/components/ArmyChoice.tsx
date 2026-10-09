import { useState } from "react";
import type { Army } from "../army";

export function ArmyChoice({
  army,
  armies,
  onSelect,
  onDelete,
}: {
  army: Army | null;
  armies: Army[];
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [ask, setAsk] = useState(false);
  const units = army?.units.length ?? 0;
  const selected = army?.name ?? "";
  return (
    <div className="field army-choice">
      <label>
        Army for this battle
        <select
          value={selected}
          onChange={(event) => {
            setAsk(false);
            onSelect(event.target.value);
          }}
        >
          <option value="">Choose an army</option>
          {armies.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.name} · {entry.points} pts
            </option>
          ))}
        </select>
      </label>
      {army ? (
        <small>
          {army.faction ? `${army.faction} · ` : ""}
          {units === 1 ? "1 unit" : `${units} units`}
        </small>
      ) : (
        <small>Pick a saved army, or import a roster.</small>
      )}
      {army && !ask && (
        <button type="button" className="quiet army-delete" onClick={() => setAsk(true)}>
          Delete this army
        </button>
      )}
      {army && ask && (
        <div className="army-delete-confirm">
          <p>Delete {army.name}? It is removed from this browser and your account.</p>
          <div className="actions">
            <button type="button" className="quiet" onClick={() => setAsk(false)}>
              Keep it
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(army.name);
                setAsk(false);
              }}
            >
              Delete army
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
