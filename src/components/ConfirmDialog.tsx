export type ConfirmKind = "next" | "end" | "leave";

export function ConfirmDialog({
  kind,
  phase,
  busy,
  onCancel,
  onConfirm,
}: {
  kind: ConfirmKind;
  phase: number | undefined;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title">
          {kind === "leave"
            ? "Leave this device session?"
            : kind === "end"
              ? "End this battle?"
              : phase === 4
                ? "Finish your turn?"
                : "Finish this phase?"}
        </h2>
        <p>
          {kind === "leave"
            ? "This removes your saved seat from this browser. You cannot reclaim a full room with its code alone."
            : kind === "end"
              ? "Both players will see the final score. You can request an agreed undo from history."
              : "Make sure all units, abilities and scoring for this step are resolved. This moves the shared game forward."}
        </p>
        <div className="actions">
          <button autoFocus onClick={onCancel}>
            Keep playing
          </button>
          <button className="primary" disabled={busy} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </section>
    </div>
  );
}
