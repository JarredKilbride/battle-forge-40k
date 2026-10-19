import type { Player } from "../types";

export function Scoreboard({
  players,
  activeId,
  meId,
  disabled,
  ended,
  readOnly = false,
  onScore,
}: {
  players: Player[];
  activeId: string | undefined;
  meId: string | undefined;
  disabled: boolean;
  ended: boolean;
  readOnly?: boolean;
  onScore: (stat: "cp" | "vp", value: number) => void;
}) {
  return (
    <div className="scoreboard">
      {players.map((p) => (
        <section
          className={`player score ${p.id === activeId ? "active" : ""}`}
          key={p.id}
        >
          <div>
            <small>
              {readOnly
                ? p.id === activeId
                  ? "ACTIVE"
                  : "PLAYER"
                : p.id === meId
                  ? "YOU"
                  : "OPPONENT"}
            </small>
            <h3>{p.name}</h3>
          </div>
          {(["cp", "vp"] as const).map((stat) => (
            <div className="counter" key={stat}>
              <span>{stat.toUpperCase()}</span>
              {readOnly ? (
                <strong className="ref-score">{p[stat]}</strong>
              ) : (
                <>
                  <button
                    aria-label={`Decrease ${p.name} ${stat}`}
                    disabled={disabled || p.id !== meId || p[stat] === 0 || ended}
                    onClick={() => onScore(stat, p[stat] - 1)}
                  >
                    −
                  </button>
                  <strong>{p[stat]}</strong>
                  <button
                    aria-label={`Increase ${p.name} ${stat}`}
                    disabled={disabled || p.id !== meId || ended}
                    onClick={() => onScore(stat, p[stat] + 1)}
                  >
                    +
                  </button>
                </>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
