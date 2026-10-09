import {
  currentWounds,
  healthSummary,
  startingWounds,
  type ArmyModel,
} from "../army";

function SoldierToken({ tone }: { tone: "full" | "hurt" | "empty" }) {
  if (tone === "empty") {
    return (
      <svg className="soldier empty" viewBox="0 0 44 36">
        <g transform="rotate(78 16 18)">
          <path d="M8 7.2C8 4.3 9.6 2.4 12 2.4s4 1.9 4 4.8V10H8V7.2z" />
          <path d="M3.5 13.2h17L18.8 24H5.2L3.5 13.2z" />
          <path d="M6.2 24.4h4.2V36H6.2zM13.6 24.4H17.8V36h-4.2z" />
        </g>
      </svg>
    );
  }
  return (
    <svg className={`soldier ${tone}`} viewBox="0 0 24 40">
      <path d="M8 7.2C8 4.3 9.6 2.4 12 2.4s4 1.9 4 4.8V10H8V7.2z" />
      <path d="M3.5 13.2h17L18.8 24H5.2L3.5 13.2z" />
      <path d="M6.2 24.4h4.2V36H6.2zM13.6 24.4H17.8V36h-4.2z" />
    </svg>
  );
}

function VehicleToken({ tone }: { tone: "full" | "hurt" | "empty" }) {
  return (
    <svg className={`soldier vehicle ${tone}`} viewBox="0 0 40 28">
      <path d="M6 12h18l4 5H8L6 12z" />
      <path d="M4 17h32v6H4z" />
      <circle cx="11" cy="23" r="3" />
      <circle cx="29" cy="23" r="3" />
    </svg>
  );
}

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
      <span className="soldier-row" aria-hidden="true">
        {remaining.map((wounds, index) => {
          const amount = Math.max(0, Math.min(full, wounds));
          const tone = amount === 0 ? "empty" : amount < full ? "hurt" : "full";
          return full >= 8 ? (
            <VehicleToken key={index} tone={tone} />
          ) : (
            <SoldierToken key={index} tone={tone} />
          );
        })}
      </span>
      <span className="wound-pips">
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
      </span>
    </div>
  );
}
