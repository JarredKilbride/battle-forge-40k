import { useState } from "react";
import {
  loginAccount,
  logoutAccount,
  registerAccount,
  type AccountResult,
  type AccountSession,
} from "../accountClient";

export function AccountDialog({
  account,
  conflict,
  onClose,
  onSignedIn,
  onSignedOut,
  onUseSaved,
  onKeepDevice,
}: {
  account: AccountSession | null;
  conflict: boolean;
  onClose: () => void;
  onSignedIn: (result: AccountResult) => void;
  onSignedOut: () => void;
  onUseSaved: () => void;
  onKeepDevice: () => void;
}) {
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(op: "login" | "register") {
    setBusy(true);
    setError("");
    try {
      const result =
        op === "login"
          ? await loginAccount(email, password)
          : await registerAccount(email, password);
      setPassword("");
      onSignedIn(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logoutAccount();
      onSignedOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
      >
        {conflict ? (
          <>
            <h2 id="account-title">Two armies found</h2>
            <p>
              This account has a saved army, and this browser has a different
              one. Choose which army to keep.
            </p>
            <div className="actions">
              <button type="button" className="primary" onClick={onUseSaved}>
                Use the saved army
              </button>
              <button type="button" onClick={onKeepDevice}>
                Keep this device's army
              </button>
            </div>
          </>
        ) : account ? (
          <>
            <p className="eyebrow">YOUR ACCOUNT</p>
            <h2 id="account-title">{account.email}</h2>
            <p>
              Importing a roster, assigning wounds, or clearing the army saves
              that army to this account. It stays with you when you sign in on
              another device.
            </p>
            <div className="actions">
              <button type="button" onClick={onClose}>
                Close
              </button>
              <button type="button" className="quiet" disabled={busy} onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">SAVE YOUR ARMY</p>
            <h2 id="account-title">Account</h2>
            <p>
              Sign in to keep your imported army with your account. Battles stay
              on this browser either way.
            </p>
            <label className="field">
              Email
              <input
                type="email"
                autoComplete="username"
                maxLength={80}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                autoComplete="current-password"
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && (
              <p className="army-error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button
                type="button"
                className="primary"
                disabled={busy || !email.trim() || password.length < 8}
                onClick={() => void submit("login")}
              >
                {busy ? "Working…" : "Sign in"}
              </button>
              <button
                type="button"
                disabled={busy || !email.trim() || password.length < 8}
                onClick={() => void submit("register")}
              >
                Create account
              </button>
              <button type="button" className="quiet" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
