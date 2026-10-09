import { guidance, rulesUrl } from "../guidance";
import { phases, type Game } from "../types";
import { Help } from "./Help";

export function PhasePanel({
  game,
  myTurn,
  activeName,
  disabled,
  onCheck,
  onFinish,
}: {
  game: Game;
  myTurn: boolean;
  activeName: string | undefined;
  disabled: boolean;
  onCheck: (key: string) => void;
  onFinish: () => void;
}) {
  const attack = game.attack;
  return (
    <section className="panel phase-panel">
      <p className="eyebrow">{phases[game.phase]} PHASE</p>
      <h2>{guidance[game.phase].title}</h2>
      <p>{guidance[game.phase].intro}</p>
      <div className="checklist">
        {guidance[game.phase].tasks.map((task, i) => (
          <label key={task}>
            <input
              type="checkbox"
              checked={game.checks.includes(String(i))}
              disabled={
                disabled || !myTurn || !!game.undo || game.status === "ended"
              }
              onChange={() => onCheck(String(i))}
            />
            <span>{task}</span>
          </label>
        ))}
      </div>
      <Help title="Explain this phase">
        <p>{guidance[game.phase].help}</p>
        <a
          href={`${rulesUrl}#page=${guidance[game.phase].page}`}
          target="_blank"
          rel="noreferrer"
        >
          Read the official core rules ↗
        </a>
      </Help>
      <Help title="Special rule or a mistake?">
        <p>
          Use your mission and current army rules for exceptions. Scores are
          manual. Record an agreed exception in history, or request undo and
          have your opponent approve it.
        </p>
      </Help>
      <button
        className="primary"
        disabled={
          disabled ||
          !myTurn ||
          !!game.undo ||
          game.status === "ended" ||
          (!!attack && attack.stage !== "done")
        }
        onClick={onFinish}
      >
        {game.phase === 4 ? "Finish turn →" : "Finish phase →"}
      </button>
      {!myTurn && game.status !== "ended" && (
        <small>
          {activeName} controls phase advancement. You can still resolve your
          saves and update your scores.
        </small>
      )}
    </section>
  );
}
