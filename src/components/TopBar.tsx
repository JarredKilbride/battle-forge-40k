export function TopBar({
  connected,
  online,
  lastSync,
  onHome,
}: {
  connected: boolean;
  online: boolean;
  lastSync: number;
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
    </header>
  );
}
