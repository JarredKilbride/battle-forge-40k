export function TopBar({
  connected,
  online,
  lastSync,
  blood,
  accountLabel,
  onBlood,
  onAccount,
  onHome,
}: {
  connected: boolean;
  online: boolean;
  lastSync: number;
  blood: boolean;
  accountLabel: string;
  onBlood: (enabled: boolean) => void;
  onAccount: () => void;
  onHome: () => void;
}) {
  return (
    <header className="topbar">
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onHome();
        }}
      >
        <span className="sigil">✦</span>
        <span>
          BATTLE FORGE<small>TABLETOP COMPANION</small>
        </span>
      </a>
      <div className="top-actions">
        <button type="button" className="quiet account-link" onClick={onAccount}>
          {accountLabel}
        </button>
        <label className="blood-toggle">
          <input
            type="checkbox"
            checked={blood}
            onChange={(event) => onBlood(event.target.checked)}
          />
          Blood
        </label>
        <div className="connection">
        {connected ? (
          <>
            <span className={online ? "lamp" : "lamp offline"} />
            {online ? "Connected" : "Reconnecting"}
            <small>
              {lastSync
                ? `Last sync ${new Date(lastSync).toLocaleTimeString()}`
                : "Restoring session"}
            </small>
          </>
        ) : (
          <span>1 v 1 · 11TH EDITION GUIDE</span>
        )}
        </div>
      </div>
    </header>
  );
}
