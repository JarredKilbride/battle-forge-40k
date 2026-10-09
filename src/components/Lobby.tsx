import { QRCodeSVG } from "qrcode.react";
import { ArmyPanel } from "../ArmyPanel";
import type { Army } from "../army";
import type { Game } from "../types";

export function Lobby({
  game,
  meId,
  army,
  isHost,
  first,
  disabled,
  localTest,
  copyState,
  share,
  onFirst,
  onCopy,
  onStart,
  onSolo,
  onLeave,
  onArmy,
}: {
  game: Game;
  meId: string | undefined;
  army: Army | null;
  isHost: boolean;
  first: string;
  disabled: boolean;
  localTest: boolean;
  copyState: string;
  share: string;
  onFirst: (playerId: string) => void;
  onCopy: () => void;
  onStart: () => void;
  onSolo: () => void;
  onLeave: () => void;
  onArmy: (army: Army | null) => void;
}) {
  const me = game.players.find((p) => p.id === meId);
  return (
    <section className="lobby panel">
      <p className="eyebrow">WAR ROOM · {game.players.length}/2 PLAYERS</p>
      <h1>Gather your opponent.</h1>
      <p>Share this room code. Keep this browser to retain your seat.</p>
      <div className="invite">
        <div>
          <strong className="room-code">{game.code}</strong>
          <button onClick={onCopy}>{copyState}</button>
          <input
            aria-label="Invite link"
            readOnly
            value={share}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div className="qr">
          <QRCodeSVG value={share} size={138} title="Scan to join this game" />
        </div>
      </div>
      <div className="players">
        {game.players.map((p) => (
          <div className="player" key={p.id}>
            <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
            <strong>{p.name}</strong>
            <small>{p.id === me?.id ? "You" : "Opponent"} · joined</small>
          </div>
        ))}
        {game.players.length < 2 && (
          <div className="player empty">Waiting for your opponent…</div>
        )}
      </div>
      <ArmyPanel compact army={army} onArmy={onArmy} />
      {isHost ? (
        <>
          <label className="field">
            Who takes the first turn?
            <select
              value={first || game.order[0]}
              onChange={(e) => onFirst(e.target.value)}
            >
              {game.players.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            disabled={disabled || game.players.length < 2}
            onClick={onStart}
          >
            Start battle →
          </button>
          {localTest && game.players.length < 2 && (
            <>
              <button className="primary" disabled={disabled} onClick={onSolo}>
                Start solo test →
              </button>
              <small>
                Solo test plays both sides on this device, including saves and
                damage.
              </small>
            </>
          )}
        </>
      ) : (
        <p>The host will choose the first player and start the battle.</p>
      )}
      <button className="quiet" onClick={onLeave}>
        Leave on this device
      </button>
    </section>
  );
}
