import { useEffect, useRef, useState } from "react";
import { load, readGame, request, save, sendAction } from "./api";
import { weaponProfile, type Army, type ArmyModel, type ArmyUnit, type ArmyWeapon } from "./army";
import type { ArmyPick, ConfirmKind, GameView } from "./components";
import { defaultProfile, type Action, type Game, type Profile, type Session } from "./types";

function storedArmy(): Army | null {
  const army = load<Army | null>("bf.army", null);
  if (!army || typeof army !== "object" || !Array.isArray(army.units))
    return null;
  return army;
}

export function useBattleSession() {
  const [session, setSession] = useState<Session | null>(() =>
    load("bf.session", null),
  );
  const [game, setGame] = useState<Game | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(false),
    [lastSync, setLastSync] = useState(0);
  const [name, setName] = useState(() => load("bf.name", "")),
    [code, setCode] = useState(
      () => new URLSearchParams(location.search).get("room") || "",
    );
  const [view, setView] = useState<GameView>("battle"),
    [profile, setProfile] = useState<Profile>(defaultProfile),
    [profiles, setProfiles] = useState<Profile[]>(() =>
      load("bf.profiles", []),
    );
  const [army, setArmy] = useState<Army | null>(storedArmy),
    [armyPick, setArmyPick] = useState<ArmyPick | null>(null),
    [armyUnit, setArmyUnit] = useState("");
  const [first, setFirst] = useState(""),
    [mode, setMode] = useState<"digital" | "physical">("digital"),
    [faces, setFaces] = useState(""),
    [note, setNote] = useState(""),
    [copyState, setCopyState] = useState("Copy invite link");
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const lock = useRef(false),
    version = useRef(-1),
    pending = useRef<{ action: Action; version: number; id: string } | null>(
      null,
    );
  const [retry, setRetry] = useState(false);
  function accept(g: Game) {
    if (g.version >= version.current) {
      version.current = g.version;
      setGame(g);
    }
    setOnline(true);
    setLastSync(Date.now());
  }
  useEffect(() => {
    if (!session) return;
    let alive = true,
      inFlight = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (inFlight || !alive) return;
      inFlight = true;
      try {
        const r = await readGame(session);
        if (alive) accept(r.game);
      } catch (e) {
        if (alive) {
          setOnline(false);
          setError((e as Error).message);
        }
      } finally {
        inFlight = false;
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
  }, [session]);
  useEffect(() => {
    if (!confirm) return;
    const previous = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirm(null);
        return;
      }
      if (e.key !== "Tab") return;
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          ".modal button:not(:disabled)",
        ),
      );
      const firstButton = buttons[0],
        last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === firstButton) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        firstButton?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [confirm]);
  async function enter(op: "create" | "join") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      ensureStorage();
      const token = load<string>("bf.pending-token", "") || crypto.randomUUID();
      save("bf.pending-token", token);
      const r = await request(token, {
        op,
        name,
        code: code.trim().toUpperCase(),
      });
      const s = { token, code: r.game.code, playerId: r.playerId };
      save("bf.session", s);
      save("bf.name", name);
      localStorage.removeItem("bf.pending-token");
      version.current = -1;
      setSession(s);
      accept(r.game);
      history.replaceState(null, "", location.pathname);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function ensureStorage() {
    save("bf.storage-check", true);
    localStorage.removeItem("bf.storage-check");
  }
  async function act(action: Action, isRetry = false) {
    if (!session || !game || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const job = isRetry
      ? pending.current
      : { action, version: game.version, id: crypto.randomUUID() };
    if (!job) {
      lock.current = false;
      setBusy(false);
      return;
    }
    pending.current = job;
    try {
      const r = await sendAction(session, job.version, job.action, job.id);
      accept(r.game);
      pending.current = null;
      setRetry(false);
      setFaces("");
    } catch (e) {
      setError((e as Error).message);
      const definitive = !!(e as { status?: number }).status;
      setRetry(!definitive);
      if (definitive) pending.current = null;
      try {
        const r = await readGame(session);
        accept(r.game);
      } catch {
        setOnline(false);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function leave() {
    localStorage.removeItem("bf.session");
    setSession(null);
    setGame(null);
    version.current = -1;
    pending.current = null;
    setRetry(false);
    setConfirm(null);
    setError("");
  }
  const me = game?.players.find((p) => p.id === session?.playerId),
    active = game?.players.find((p) => p.id === game.order[game.turn]);
  const myTurn = active?.id === session?.playerId;
  const disabled = busy || !online || retry;
  const share = game
    ? `${location.origin}${location.pathname}?room=${game.code}`
    : "";
  const localTest =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1";
  async function copy() {
    try {
      await navigator.clipboard.writeText(share);
      setCopyState("Copied!");
    } catch {
      setCopyState("Select and copy the link below");
    }
  }
  function storeProfile() {
    try {
      if (!profile.name.trim()) throw new Error("Name your weapon first.");
      if (
        profiles.length >= 30 &&
        !profiles.some((p) => p.name === profile.name)
      )
        throw new Error("You can save up to 30 profiles.");
      const next = [
        ...profiles.filter((p) => p.name !== profile.name),
        profile,
      ];
      save("bf.profiles", next);
      setProfiles(next);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function storeArmy(next: Army | null) {
    setArmy(next);
    setArmyPick(null);
    setArmyUnit("");
  }
  function applyArmyWeapon(
    unit: ArmyUnit,
    model: ArmyModel,
    weapon: ArmyWeapon,
    goToBattle: boolean,
  ) {
    setArmyPick({ unit, model, weapon });
    const index = army?.units.indexOf(unit) ?? -1;
    setArmyUnit(index >= 0 ? String(index) : "");
    setProfile(
      weaponProfile(unit, model, weapon, {
        toughness: profile.toughness,
        save: profile.save,
        invuln: profile.invuln,
      }),
    );
    if (goToBattle) setView("battle");
  }
  function removeProfile(profileName: string) {
    const next = profiles.filter((x) => x.name !== profileName);
    save("bf.profiles", next);
    setProfiles(next);
  }
  return {
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
    applyArmyWeapon,
    removeProfile,
  };
}
