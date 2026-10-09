import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  readAccount,
  sameArmy,
  saveAccountArmy,
  writeAccount,
  type AccountResult,
  type AccountSession,
} from "./accountClient";
import { ArmyPanel } from "./ArmyPanel";
import type { Army } from "./army";
import {
  BattleGuide,
  ConfirmDialog,
  ErrorNotice,
  GameShell,
  HistoryView,
  Lobby,
  ProfilesView,
  SettingsPage,
  TopBar,
  Welcome,
} from "./components";
import { readBloodMotion, writeBloodMotion } from "./bloodMotion";
import { rulesUrl } from "./guidance";
import { useBattleSession } from "./useBattleSession";
import "./style.css";

function App() {
  const [blood, setBlood] = useState(readBloodMotion);
  const [account, setAccount] = useState<AccountSession | null>(readAccount);
  const [settings, setSettings] = useState(false);
  const [savedArmy, setSavedArmy] = useState<Army | null>(null);
  const {
    session,
    game,
    error,
    setError,
    busy,
    online,
    lastSync,
    name,
    setName,
    code,
    setCode,
    view,
    setView,
    profile,
    setProfile,
    profiles,
    army,
    armies,
    selectArmy,
    deleteArmy,
    replaceArmies,
    armyPick,
    armyUnit,
    setArmyUnit,
    setArmyPick,
    first,
    setFirst,
    mode,
    setMode,
    faces,
    setFaces,
    note,
    setNote,
    copyState,
    confirm,
    setConfirm,
    retry,
    me,
    active,
    myTurn,
    disabled,
    share,
    localTest,
    enter,
    act,
    leave,
    copy,
    storeProfile,
    storeArmy,
    recordWounds,
    bloodHit,
    applyArmyWeapon,
    removeProfile,
  } = useBattleSession();

  function remember(next: AccountSession | null) {
    writeAccount(next);
    setAccount(next);
  }

  function signedIn(result: AccountResult) {
    remember({ email: result.email, token: result.token });
    if (result.armies.length) replaceArmies(result.armies);
    if (result.army && army && !sameArmy(result.army, army)) {
      setSavedArmy(result.army);
      return;
    }
    if (result.army) storeArmy(result.army);
    else if (army) {
      void saveAccountArmy(army).catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Could not save your army."),
      );
    }
  }

  return (
    <>
      <TopBar
        connected={!!session}
        online={online}
        lastSync={lastSync}
        blood={blood}
        accountLabel="Settings"
        onBlood={(enabled) => {
          setBlood(enabled);
          writeBloodMotion(enabled);
        }}
        onAccount={() => setSettings(true)}
        onHome={() => {
          setSettings(false);
          setView("battle");
        }}
      />
      <main>
        {error && (
          <ErrorNotice
            message={error}
            retry={retry}
            busy={busy}
            onRetry={() => act({ type: "unused" }, true)}
            onDismiss={() => setError("")}
          />
        )}
        {settings ? (
          <SettingsPage
            account={account}
            armyLabel={
              army
                ? `${army.name} is on this device and saves to this account.`
                : "No army is on this device yet."
            }
            army={army}
            armies={armies}
            conflict={savedArmy !== null}
            onBack={() => setSettings(false)}
            onSignedIn={signedIn}
            onSignedOut={() => {
              remember(null);
              setSavedArmy(null);
            }}
            onUseSaved={() => {
              if (savedArmy) storeArmy(savedArmy);
              setSavedArmy(null);
            }}
            onSelectArmy={selectArmy}
            onDeleteArmy={deleteArmy}
            onArmy={storeArmy}
            onKeepDevice={() => {
              if (army) {
                void saveAccountArmy(army).catch((caught) =>
                  setError(
                    caught instanceof Error ? caught.message : "Could not save your army.",
                  ),
                );
              }
              setSavedArmy(null);
            }}
          />
        ) : !session ? (
          <Welcome
            name={name}
            code={code}
            busy={busy}
            army={army}
            armies={armies}
            onName={setName}
            onCode={setCode}
            onSelectArmy={selectArmy}
            onDeleteArmy={deleteArmy}
            onCreate={() => enter("create")}
            onJoin={() => enter("join")}
          />
        ) : !game ? (
          <section className="panel loading">
            <h1>Rejoining your battle…</h1>
            <p>Your saved player session is being restored.</p>
            <button onClick={() => setConfirm("leave")}>
              Leave this device session
            </button>
          </section>
        ) : game.status === "lobby" ? (
          <Lobby
            game={game}
            meId={session.playerId}
            army={army}
            armies={armies}
            isHost={session.playerId === game.host}
            first={first}
            disabled={disabled}
            localTest={localTest}
            copyState={copyState}
            share={share}
            onFirst={setFirst}
            onCopy={() => void copy()}
            onStart={() =>
              act({ type: "start", first: first || game.order[0] })
            }
            onSolo={() =>
              act({
                type: "start",
                first: me?.id || game.order[0],
                solo: true,
              })
            }
            onLeave={() => setConfirm("leave")}
            onArmy={storeArmy}
            onSelectArmy={selectArmy}
            onDeleteArmy={deleteArmy}
          />
        ) : (
          <GameShell
            game={game}
            meId={me?.id}
            activeId={active?.id}
            activeName={active?.name}
            myTurn={myTurn}
            isHost={session.playerId === game.host}
            view={view}
            disabled={disabled}
            onView={setView}
            onScore={(stat, value) => act({ type: "score", stat, value })}
            onUndoAnswer={(accept) => act({ type: "undo-answer", accept })}
            onLeave={() => setConfirm("leave")}
            onEnd={() => setConfirm("end")}
          >
            {view === "battle" && (
              <BattleGuide
                game={game}
                myTurn={myTurn}
                activeName={active?.name}
                meId={me?.id}
                disabled={disabled}
                army={army}
                armyUnit={armyUnit}
                armyPick={armyPick}
                profiles={profiles}
                profile={profile}
                mode={mode}
                faces={faces}
                onCheck={(key) => act({ type: "check", key })}
                onFinish={() => setConfirm("next")}
                onProfile={setProfile}
                onArmyUnit={(index) => {
                  setArmyUnit(index);
                  setArmyPick(null);
                }}
                onArmyWeapon={(unit, model, weapon) =>
                  applyArmyWeapon(unit, model, weapon, false)
                }
                onRecordWounds={recordWounds}
                blood={blood}
                bloodHit={bloodHit}
                onMode={setMode}
                onFaces={setFaces}
                onAct={act}
              />
            )}
            {view === "army" && (
              <ArmyPanel
                army={army}
                blood={blood}
                bloodHit={bloodHit}
                accountEmail={account?.email}
                onArmy={storeArmy}
                onUseWeapon={(unit, model, weapon) =>
                  applyArmyWeapon(unit, model, weapon, true)
                }
              />
            )}
            {view === "profiles" && (
              <ProfilesView
                profiles={profiles}
                profile={profile}
                onProfile={setProfile}
                onSave={storeProfile}
                onRemove={removeProfile}
              />
            )}
            {view === "history" && (
              <HistoryView
                game={game}
                disabled={disabled}
                note={note}
                onNote={setNote}
                onAdd={() => {
                  void act({ type: "note", text: note });
                  setNote("");
                }}
                onUndo={() => act({ type: "undo-request" })}
              />
            )}
          </GameShell>
        )}
      </main>
      <footer>
        Unofficial fan companion · Core guide: June 2026 ·{" "}
        <a href={rulesUrl} target="_blank" rel="noreferrer">
          Official rules
        </a>
        <br />
        Check current mission, army rules and updates. Not affiliated with Games
        Workshop.
      </footer>
      {confirm && (
        <ConfirmDialog
          kind={confirm}
          phase={game?.phase}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm === "leave") leave();
            else {
              void act({ type: confirm });
              setConfirm(null);
            }
          }}
        />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
