import type { Game } from "../types";
import { DiceRow } from "./DiceRow";
import { Help } from "./Help";

export function HistoryView({
  game,
  disabled,
  note,
  onNote,
  onAdd,
  onUndo,
}: {
  game: Game;
  disabled: boolean;
  note: string;
  onNote: (note: string) => void;
  onAdd: () => void;
  onUndo: () => void;
}) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">SHARED RECORD</p>
          <h2>Action history</h2>
        </div>
        <button disabled={disabled || !game.canUndo || !!game.undo} onClick={onUndo}>
          Request undo
        </button>
      </div>
      <form
        className="note-form"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd();
        }}
      >
        <label className="field">
          Record a tabletop result or agreed exception
          <input
            maxLength={300}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder="Charge roll, damage adjustment, mission score…"
          />
        </label>
        <button
          disabled={
            disabled || !note.trim() || !!game.undo || game.status === "ended"
          }
        >
          Add note
        </button>
      </form>
      <ol className="history">
        {[...game.history].reverse().map((e) => (
          <li key={e.id}>
            <time>
              {new Date(e.at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <div>
              <p>{e.text}</p>
              {e.dice && (
                <Help title="View dice">
                  <DiceRow dice={e.dice} />
                </Help>
              )}
            </div>
          </li>
        ))}
      </ol>
      <small>
        Last 250 actions retained. Undo restores the latest action’s game state
        without hiding its history.
      </small>
    </section>
  );
}
