export function Welcome({
  name,
  code,
  busy,
  onName,
  onCode,
  onCreate,
  onJoin,
}: {
  name: string;
  code: string;
  busy: boolean;
  onName: (name: string) => void;
  onCode: (code: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <section className="welcome">
      <div className="intro">
        <p className="eyebrow">LESS CONFUSION. MORE BATTLE.</p>
        <h1>
          Your next move.
          <br />
          <em>Made clear.</em>
        </h1>
        <p>
          A shared turn guide for you and your opponent. One battle, two
          phones, every action in order.
        </p>
        <div className="intro-steps">
          <span>01 / Join forces</span>
          <span>02 / Follow the phase</span>
          <span>03 / Roll together</span>
        </div>
      </div>
      <div className="panel join">
        <p className="eyebrow">ENTER THE BATTLEFIELD</p>
        <h2>Ready your army</h2>
        <label className="field">
          Your name
          <input
            autoComplete="nickname"
            maxLength={40}
            placeholder="Commander name"
            value={name}
            onChange={(e) => onName(e.target.value)}
          />
        </label>
        <button
          className="primary"
          disabled={busy || !name.trim()}
          onClick={onCreate}
        >
          {busy ? "Connecting…" : "Create a game"}
        </button>
        <div className="divider">OR JOIN YOUR OPPONENT</div>
        <label className="field">
          Room code
          <input
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={10}
            placeholder="10-character code"
            value={code}
            onChange={(e) => onCode(e.target.value.toUpperCase())}
          />
        </label>
        <button disabled={busy || !name.trim() || code.length !== 10} onClick={onJoin}>
          Join game →
        </button>
        <small>
          An account is optional. Use Account to keep your army when you switch
          devices. Your battle seat stays on this browser for seven days.
        </small>
      </div>
    </section>
  );
}
