import { useState } from "react";
import { parseArmyJson, type Army } from "../army";
import { ArmyChoice } from "./ArmyChoice";
import {
  changeAccountPassword,
  deleteAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  type AccountResult,
  type AccountSession,
} from "../accountClient";

export function SettingsPage({
  account,
  armyLabel,
  army,
  armies,
  conflict,
  onBack,
  onSignedIn,
  onSignedOut,
  onUseSaved,
  onKeepDevice,
  onSelectArmy,
  onDeleteArmy,
  onArmy,
}: {
  account: AccountSession | null;
  armyLabel: string;
  army: Army | null;
  armies: Army[];
  conflict: boolean;
  onBack: () => void;
  onSignedIn: (result: AccountResult) => void;
  onSignedOut: () => void;
  onUseSaved: () => void;
  onKeepDevice: () => void;
  onSelectArmy: (name: string) => void;
  onDeleteArmy: (name: string) => void;
  onArmy: (army: Army) => void;
}) {
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel settings-page">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h2>Settings</h2>
      {conflict ? (
        <>
          <p>
            This account has a saved army, and this browser has a different one.
            Choose which army to keep.
          </p>
          <div className="actions settings-actions">
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
          <p>
            Signed in as <strong>{account.email}</strong>. {armyLabel}
          </p>
          <ArmyChoice
            army={army}
            armies={armies}
            onSelect={onSelectArmy}
            onDelete={onDeleteArmy}
          />
          <ArmyImport onArmy={onArmy} />
          <div className="settings-block">
            <h3>Password</h3>
            <label className="field">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="field">
              New password
              <input
                type="password"
                autoComplete="new-password"
                maxLength={72}
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
              />
            </label>
            <div className="actions settings-actions">
              <button
                type="button"
                className="primary"
                disabled={busy || password.length < 8 || nextPassword.length < 8}
                onClick={() =>
                  void run(async () => {
                    await changeAccountPassword(password, nextPassword);
                    setPassword("");
                    setNextPassword("");
                    setNotice("Password updated.");
                  })
                }
              >
                Change password
              </button>
            </div>
          </div>
          <div className="settings-block">
            <h3>This device</h3>
            <p>Signing out keeps the army on this browser. The account copy stays saved.</p>
            <div className="actions settings-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await logoutAccount();
                    onSignedOut();
                  })
                }
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="settings-block">
            <h3>Delete account</h3>
            <p>
              This removes the account and the army saved on it. The army on this
              browser stays.
            </p>
            <label className="field">
              Password
              <input
                type="password"
                autoComplete="current-password"
                maxLength={72}
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
              />
            </label>
            <div className="actions settings-actions">
              <button
                type="button"
                disabled={busy || deletePassword.length < 8}
                onClick={() =>
                  void run(async () => {
                    await deleteAccount(deletePassword);
                    onSignedOut();
                  })
                }
              >
                Delete account
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p>
            Sign in to keep your imported armies with your account. Battles stay
            on this browser either way.
          </p>
          <ArmyChoice
            army={army}
            armies={armies}
            onSelect={onSelectArmy}
            onDelete={onDeleteArmy}
          />
          <ArmyImport onArmy={onArmy} />
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
          <div className="actions settings-actions">
            <button
              type="button"
              className="primary"
              disabled={busy || !email.trim() || password.length < 8}
              onClick={() =>
                void run(async () => {
                  const result = await loginAccount(email, password);
                  setPassword("");
                  onSignedIn(result);
                })
              }
            >
              {busy ? "Working…" : "Sign in"}
            </button>
            <button
              type="button"
              disabled={busy || !email.trim() || password.length < 8}
              onClick={() =>
                void run(async () => {
                  const result = await registerAccount(email, password);
                  setPassword("");
                  onSignedIn(result);
                })
              }
            >
              Create account
            </button>
          </div>
        </>
      )}
      {notice && <p>{notice}</p>}
      {error && (
        <p className="army-error" role="alert">
          {error}
        </p>
      )}
      <div className="actions settings-actions">
        <button type="button" className="quiet" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}

function ArmyImport({ onArmy }: { onArmy: (army: Army) => void }) {
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function importText(text: string) {
    try {
      const next = parseArmyJson(text);
      onArmy(next);
      setPaste("");
      setError("");
      setNotice(`${next.name} is ready for the next battle.`);
    } catch (caught) {
      setNotice("");
      setError(
        caught instanceof Error ? caught.message : "Could not import that roster.",
      );
    }
  }

  return (
    <div className="settings-block">
      <h3>Import an army</h3>
      <p>Add a New Recruit or BattleScribe roster. It joins the army list above.</p>
      <label className="field">
        Roster file (.json)
        <input
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void file.text().then(importText).catch(() => {
              setNotice("");
              setError("Could not read that file.");
            });
          }}
        />
      </label>
      <label className="field">
        Paste roster JSON
        <textarea
          value={paste}
          onChange={(event) => {
            setPaste(event.target.value);
            setError("");
            setNotice("");
          }}
          placeholder='{"roster":{"name":"Army","forces":[]}}'
        />
      </label>
      <div className="actions settings-actions">
        <button type="button" disabled={!paste.trim()} onClick={() => importText(paste)}>
          Import pasted roster
        </button>
      </div>
      {notice && <p>{notice}</p>}
      {error && (
        <p className="army-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
