import {
  currentWounds,
  healthSummary,
  startingWounds,
  type ArmyModel,
} from "../army";

export function WoundBar({ model }: { model: ArmyModel }) {
  const full = startingWounds(model);
  const remaining = currentWounds(model);
  if (full == null || !remaining) return null;
  const now = remaining.reduce((sum, wounds) => sum + Math.max(0, wounds), 0);
  return (
    <div
      className="wound-bar"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={full * remaining.length}
      aria-valuenow={now}
      aria-label={`${model.name}: ${healthSummary(model)}`}
    >
      {remaining.map((wounds, index) => {
        const amount = Math.max(0, Math.min(full, wounds));
        const tone = amount === 0 ? "empty" : amount < full ? "hurt" : "full";
        return (
          <span
            key={index}
            className={`wound-pip ${tone}`}
            title={`${amount} of ${full} wounds`}
          >
            <span style={{ width: `${(amount / full) * 100}%` }} />
          </span>
        );
      })}
    </div>
  );
}
