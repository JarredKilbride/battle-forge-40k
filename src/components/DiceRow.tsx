import type { Dice } from "../types";

export function DiceRow({ dice }: { dice: Dice }) {
  return (
    <div className="dice-block">
      <small>
        {dice.label.toUpperCase()} ·{" "}
        {dice.target <= 6 ? `${dice.target}+` : "No possible save"} ·{" "}
        {dice.mode}
      </small>
      <div className="dice-grid">
        {dice.faces.map((n, i) => (
          <span
            className={`dice ${n >= dice.target && n !== 1 ? "pass" : "fail"} ${n === 6 ? "critical" : ""}`}
            key={i}
            title={
              dice.originals && dice.originals[i] !== n
                ? `Re-rolled ${dice.originals[i]} → ${n}`
                : String(n)
            }
          >
            {n}
            {dice.originals && dice.originals[i] !== n && <sup>↻</sup>}
          </span>
        ))}
        {!dice.faces.length && <span>No dice needed.</span>}
      </div>
    </div>
  );
}
