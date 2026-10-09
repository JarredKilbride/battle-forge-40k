import type { ReactNode } from "react";
import type { Game } from "../types";
import { Scoreboard } from "./Scoreboard";

export type GameView = "battle" | "profiles" | "history" | "army";

const VIEW_LABEL: Record<GameView, string> = {
  battle: "Battle guide",
  profiles: "Weapon profiles",
  army: "Army",
  history: "Action history",
};

export function GameShell({
  game,
  meId,
  activeId,
  activeName,
  myTurn,
  isHost,
  view,
  disabled,
  onView,
  onScore,
  onUndoAnswer,
  onLeave,
  onEnd,
  children,
}: {
  game: Game;
  meId: string | undefined;
  activeId: string | undefined;
  activeName: string | undefined;
  myTurn: boolean;
  isHost: boolean;
  view: GameView;
  disabled: boolean;
  onView: (view: GameView) => void;
  onScore: (stat: "cp" | "vp", value: number) => void;
  onUndoAnswer: (accept: boolean) => void;
  onLeave: () => void;
  onEnd: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="battle-heading">
        <div>
          <p className="eyebrow">
            ROOM {game.code} · ROUND {game.round}
          </p>
          <h1>
            {game.status === "ended"
              ? "Battle complete"
              : `${activeName}’s turn`}
          </h1>
        </div>
        <span className="your-turn">
          {game.status === "ended"
            ? "FINAL SCORE"
            : myTurn
              ? "YOUR TURN"
              : "OPPONENT’S TURN"}
        </span>
      </div>
      <Scoreboard
        players={game.players}
        activeId={activeId}
        meId={meId}
        disabled={disabled}
        ended={game.status === "ended"}
        onScore={onScore}
      />
      {game.undo && (
        <div className="notice">
          <strong>Undo requested</strong>
          <p>{game.undo.label}</p>
          {game.undo.by !== meId || game.players.length === 1 ? (
            <div className="actions">
              <button disabled={disabled} onClick={() => onUndoAnswer(true)}>
                Approve undo
              </button>
              <button disabled={disabled} onClick={() => onUndoAnswer(false)}>
                Keep action
              </button>
            </div>
          ) : (
            <p>Waiting for your opponent’s approval.</p>
          )}
        </div>
      )}
      <nav className="tabs" aria-label="Game views">
        {(["battle", "profiles", "army", "history"] as const).map((v) => (
          <button
            key={v}
            aria-current={view === v ? "page" : undefined}
            onClick={() => onView(v)}
          >
            {VIEW_LABEL[v]}
          </button>
        ))}
      </nav>
      {children}
      <div className="game-footer">
        <button className="quiet" onClick={onLeave}>
          Leave on this device
        </button>
        {isHost && game.status === "battle" && (
          <button className="quiet" disabled={disabled || !!game.undo} onClick={onEnd}>
            End battle
          </button>
        )}
        <span>Room expires {new Date(game.expiresAt).toLocaleDateString()}</span>
      </div>
    </>
  );
}
