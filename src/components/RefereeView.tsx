import { useEffect, useState } from "react";
import { watchGame } from "../api";
import { phases, type Game } from "../types";
import { Scoreboard } from "./Scoreboard";

export function RefereeView({
  code,
  onBack,
}: {
  code: string;
  onBack: () => void;
}) {
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await watchGame(code);
        if (!alive) return;
        setGame(next);
        setError("");
      } catch (caught) {
        if (alive) setError(caught instanceof Error ? caught.message : "Could not open that room.");
      } finally {
        if (alive) timer = setTimeout(poll, document.hidden ? 12000 : 2500);
      }
    };
    void poll();
    const wake = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void poll();
      }
    };
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [code]);

  const activeId = game?.status === "battle" ? game.order[game.turn] : undefined;
  const active = game?.players.find((player) => player.id === activeId);
  const attack = game?.attack;
  const attacker = game?.players.find((player) => player.id === attack?.attacker);
  const defender = game?.players.find((player) => player.id === attack?.defender);

  return (
    <section className="ref-page">
      <div className="battle-heading">
        <div>
          <p className="eyebrow">REFEREE · ROOM {code}</p>
          <h1>
            {!game
              ? "Opening the room…"
              : game.status === "lobby"
                ? "Waiting for the battle to start"
                : game.status === "ended"
                  ? "Battle complete"
                  : `${active?.name ?? "A player"}’s turn`}
          </h1>
          <p>
            You are watching this room. You are not a player, and nothing you do
            here changes the game.
          </p>
        </div>
        <button type="button" className="quiet" onClick={onBack}>
          Back
        </button>
      </div>
      {error && <p className="codex-over">{error}</p>}
      {game && (
        <>
          <p className="codex-meta">
            {game.status === "battle"
              ? `Round ${game.round} · ${phases[game.phase]} phase`
              : game.status === "lobby"
                ? "Lobby"
                : "Ended"}
            {game.players.length < 2 ? " · Waiting for a second player" : ""}
          </p>
          <Scoreboard
            players={game.players}
            activeId={activeId}
            meId={undefined}
            disabled
            ended
            readOnly
            onScore={() => undefined}
          />
          {attack && (
            <section className="panel">
              <p className="eyebrow">ATTACK IN PROGRESS</p>
              <h2>{attack.profile.name}</h2>
              <p>
                {attacker?.name ?? "Attacker"} against {defender?.name ?? "defender"}.{" "}
                {attack.stage === "done" ? "Damage acknowledged." : `Rolling ${attack.stage}.`}
              </p>
              <p className="codex-meta">
                Hits {attack.hits} · Wounds {attack.wounds} · Failed saves {attack.failed} ·
                Damage {attack.damage}
              </p>
            </section>
          )}
          <section className="panel">
            <p className="eyebrow">RECENT ACTIONS</p>
            <h2>What has happened</h2>
            {game.history.length === 0 && <p>No actions yet.</p>}
            <ol className="history">
              {[...game.history].reverse().slice(0, 12).map((entry) => (
                <li key={entry.id}>
                  <time>
                    {new Date(entry.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <div>
                    <p>{entry.text}</p>
                    {entry.dice && (
                      <p className="codex-meta">
                        {entry.dice.label}: {entry.dice.faces.join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </section>
  );
}
